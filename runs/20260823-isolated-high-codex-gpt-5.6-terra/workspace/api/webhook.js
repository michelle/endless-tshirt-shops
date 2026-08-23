const crypto = require('crypto');
const {stripe, fulfill, json} = require('./_lib');

function verifySignature(raw, signature, secret) {
  const parts = Object.fromEntries(signature.split(',').map(x => x.split('=')));
  if (!parts.t || !parts.v1) return false;
  const signed = `${parts.t}.${raw}`;
  const expected = crypto.createHmac('sha256', secret).update(signed).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
}
module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, {error:'Method not allowed.'});
  const rawBuffer = await new Promise((resolve, reject) => { const chunks=[]; req.on('data', chunk => chunks.push(chunk)); req.on('end', () => resolve(Buffer.concat(chunks))); req.on('error', reject); });
  const raw = rawBuffer.toString('utf8');
  try {
    if (!process.env.STRIPE_WEBHOOK_SECRET) throw new Error('Webhook secret is not configured.');
    if (!verifySignature(raw, req.headers['stripe-signature'] || '', process.env.STRIPE_WEBHOOK_SECRET)) throw new Error('Invalid Stripe signature.');
    const event = JSON.parse(raw);
    if (event.type === 'checkout.session.completed' && event.data.object.payment_status === 'paid') {
      const id = event.data.object.id;
      const session = await stripe(`/checkout/sessions/${id}`);
      if (!session.metadata?.fulfillment_order_id) {
        const orderId = await fulfill(session);
        await stripe(`/checkout/sessions/${id}`, {'metadata[fulfillment_order_id]':orderId, 'metadata[fulfilled_at]':new Date().toISOString()});
      }
    }
    return json(res, 200, {received:true});
  } catch (error) { console.error('Webhook failed', error); return json(res, 400, {error:error.message}); }
};
module.exports.config = {api:{bodyParser:false}};
