import Stripe from 'stripe';

const skuForCut = { fitted: 'GLOBAL-TEE-BC-6004', unisex: 'GLOBAL-TEE-BC-3003' };
export async function fulfillSession(sessionId, origin) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.PRODIGI_API_KEY) throw new Error('Order services are not configured.');
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== 'paid') throw new Error('Payment is not complete.');
  const { cut, size, timestamp } = session.metadata || {};
  const address = session.shipping_details?.address || session.customer_details?.address;
  const name = session.shipping_details?.name || session.customer_details?.name;
  if (!skuForCut[cut] || !['S', 'M', 'L', 'XL'].includes(size) || !address?.line1 || !name) throw new Error('The shipping details for this order are incomplete.');
  const productSize = size.toLowerCase();
  const payload = {
    merchantReference: `datetime-${session.id}`,
    idempotencyKey: session.id,
    shippingMethod: 'Standard',
    recipient: { name, email: session.customer_details?.email, address: { line1: address.line1, line2: address.line2 || null, postalOrZipCode: address.postal_code, countryCode: address.country, townOrCity: address.city, stateOrCounty: address.state || null } },
    items: [{ sku: skuForCut[cut], copies: 1, sizing: 'fitPrintArea', attributes: { color: 'black', size: productSize }, assets: [{ printArea: 'front', url: `${origin}/api/artwork?timestamp=${encodeURIComponent(timestamp)}` }] }],
    metadata: { stripeCheckoutSessionId: session.id, timestamp, cut, size },
  };
  const base = process.env.PRODIGI_LIVE === 'true' ? 'https://api.prodigi.com' : 'https://api.sandbox.prodigi.com';
  const response = await fetch(`${base}/v4.0/Orders`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-Key': process.env.PRODIGI_API_KEY }, body: JSON.stringify(payload) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.order?.id) throw new Error(body.error?.message || body.message || 'Prodigi could not create the fulfillment order.');
  return body.order.id;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const sessionId = req.query.session_id;
  if (!/^cs_(test|live)_/.test(String(sessionId))) return res.status(400).json({ error: 'Invalid checkout session.' });
  const origin = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers['x-forwarded-host'] || req.headers.host}`;
  try { return res.status(200).json({ orderId: await fulfillSession(sessionId, origin) }); }
  catch (error) { console.error('Fulfillment error', error.message); return res.status(422).json({ error: error.message }); }
}
