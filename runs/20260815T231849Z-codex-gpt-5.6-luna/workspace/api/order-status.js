import Stripe from 'stripe';
import sharp from 'sharp';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || process.env.STRIPE_AUTH);
const sizes = { S: 'sml', M: 'med', L: 'lrg', XL: 'xlg' };
const products = { fitted: 'next-level-boyfriend-tee', unisex: 'next-level-fitted-crew' };
async function sp(path, options = {}) { const response = await fetch(`https://api.scalablepress.com/v2/${path}`, { ...options, headers: { Authorization: `Basic ${Buffer.from(`:${process.env.SP_AUTH}`).toString('base64')}`, ...(options.headers || {}) } }); const body = await response.json(); if (!response.ok || body.statusCode > 300) throw new Error(body.message || `Scalable Press ${path} failed`); return body; }
export default async function handler(req, res) {
  if (req.method !== 'GET' || !req.query.session_id) return res.status(400).json({ error: 'Missing session.' });
  try {
    const session = await stripe.checkout.sessions.retrieve(req.query.session_id);
    if (session.payment_status !== 'paid') return res.status(402).json({ error: 'Payment has not completed.' });
    if (session.metadata?.fulfillment_order) return res.status(200).json({ orderId: session.metadata.fulfillment_order, fulfillment: 'submitted' });
    const { fit, size, timestamp } = session.metadata || {};
    // The artwork is intentionally generated server-side so the fulfillment design is identical to the preview.
    const artwork = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200"><rect width="100%" height="100%" fill="black"/><text x="600" y="600" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="monospace" font-size="64">${String(timestamp).replace(/[<&>]/g, '')}</text></svg>`;
    const artworkPng = await sharp(Buffer.from(artwork)).png().toBuffer();
    const form = new FormData(); form.append('type', 'dtg'); form.append('sides[front][artwork]', new Blob([artworkPng], { type: 'image/png' }), 'artwork.png'); form.append('sides[front][dimensions][width]', '8'); form.append('sides[front][position][horizontal]', 'C'); form.append('sides[front][position][offset][top]', '3');
    const design = await sp('design', { method: 'POST', body: form });
    const quote = await sp('quote', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'dtg', products: [{ id: products[fit], color: 'Black', quantity: 1, size: sizes[size] }], designId: design.designId, address: session.customer_details?.address }) });
    const order = await sp('order', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orderToken: quote.orderToken }) });
    await stripe.checkout.sessions.update(req.query.session_id, { metadata: { ...session.metadata, fulfillment_order: order.orderId } });
    return res.status(200).json({ orderId: order.orderId, fulfillment: 'submitted' });
  } catch (error) { console.error(error); return res.status(502).json({ error: 'Payment succeeded, but fulfillment needs attention. Please email hello@datetime.store.' }); }
}
