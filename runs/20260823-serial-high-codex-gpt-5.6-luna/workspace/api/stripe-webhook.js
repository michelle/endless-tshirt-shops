const { stripeClient, json, quote, createSpOrder } = require('./_lib');

async function fulfill(session) {
  const stripe = stripeClient();
  if (session.payment_status !== 'paid') return;
  const metadata = session.metadata || {};
  if (metadata.fulfillment_status === 'complete' || metadata.fulfillment_status === 'processing') return;
  await stripe.checkout.sessions.update(session.id, { metadata: { ...metadata, fulfillment_status: 'processing' } });
  try {
    const shipping = session.shipping_details?.address || session.customer_details?.address || {};
    const address = { name: session.shipping_details?.name || session.customer_details?.name || '', address1: shipping.line1 || '', address2: shipping.line2 || '', city: shipping.city || '', state: shipping.state || '', zip: shipping.postal_code || '', country: shipping.country || '' };
    const quoted = await quote({ style: metadata.style, size: metadata.size, designId: metadata.design_id, address });
    if (quoted.orderIssues?.length || !quoted.orderToken) throw new Error(quoted.orderIssues?.[0]?.message || 'Scalable Press could not quote this order.');
    const order = await createSpOrder(quoted.orderToken);
    if (order.statusCode > 300 || !order.orderId) throw new Error(order.orderIssues?.[0]?.message || 'Scalable Press could not create this order.');
    await stripe.checkout.sessions.update(session.id, { metadata: { ...metadata, fulfillment_status: 'complete', order_id: String(order.orderId), order_token: String(quoted.orderToken) } });
  } catch (error) {
    console.error('[fulfill]', error);
    await stripe.checkout.sessions.update(session.id, { metadata: { ...metadata, fulfillment_status: 'needs_attention', fulfillment_error: String(error.message || 'Provider error').slice(0, 450) } });
    throw error;
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed.' });
  try {
    const signature = req.headers['stripe-signature'];
    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) return json(res, 400, { error: 'Webhook is not configured.' });
    const stripe = stripeClient();
    const rawBody = await rawRequestBody(req);
    const event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') await fulfill(event.data.object);
    return json(res, 200, { received: true });
  } catch (error) {
    console.error('[stripe-webhook]', error);
    return json(res, 400, { error: error.message || 'Invalid webhook.' });
  }
};

module.exports.fulfill = fulfill;

function rawRequestBody(req) {
  if (req.rawBody) return Promise.resolve(req.rawBody);
  if (typeof req.body === 'string' || Buffer.isBuffer(req.body)) return Promise.resolve(req.body);
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports.config = { api: { bodyParser: false } };
