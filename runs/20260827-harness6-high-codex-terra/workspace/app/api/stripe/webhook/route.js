import Stripe from 'stripe';

export const runtime = 'nodejs';
const PRODIGI_SANDBOX = 'https://api.sandbox.prodigi.com/v4.0';

function appUrl(request) { return process.env.APP_URL || new URL(request.url).origin; }

async function placeProdigiOrder(session, request) {
  if (!process.env.PRODIGI_API_KEY) throw new Error('Prodigi is not configured');
  const address = session.shipping_details?.address;
  const recipient = session.shipping_details?.name;
  const metadata = session.metadata || {};
  if (!address || !recipient || !metadata.stamp || !metadata.size) throw new Error('Missing fulfillment details');
  const base = process.env.PRODIGI_API_BASE || PRODIGI_SANDBOX;
  const body = {
    merchantReference: `datetime-${session.id}`,
    idempotencyKey: session.id,
    shippingMethod: 'standard',
    recipient: { name: recipient, email: session.customer_details?.email || undefined, phoneNumber: session.customer_details?.phone || undefined, address: { line1: address.line1, line2: address.line2 || undefined, postalOrZipCode: address.postal_code, countryCode: address.country, townOrCity: address.city, stateOrCounty: address.state || undefined } },
    items: [{ merchantReference: `timestamp-${metadata.stamp}`, sku: metadata.sku || 'GLOBAL-TEE-BC-3001', copies: 1, sizing: 'fitPrintArea', recipientCost: { amount: '29.00', currency: 'USD' }, attributes: { color: 'black', size: metadata.size.toLowerCase() }, assets: [{ printArea: 'front', url: `${appUrl(request)}/api/artwork?stamp=${encodeURIComponent(metadata.stamp)}` }] }],
    metadata: { stripeCheckoutSessionId: session.id, timestamp: metadata.stamp, fit: metadata.fit || 'unisex' },
    callbackUrl: `${appUrl(request)}/api/prodigi/webhook`,
  };
  const response = await fetch(`${base}/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-Key': process.env.PRODIGI_API_KEY }, body: JSON.stringify(body) });
  const payload = await response.json();
  if (!response.ok || !['Created', 'CreatedWithIssues', 'OnHold', 'AlreadyExists'].includes(payload.outcome)) throw new Error(`Prodigi rejected order: ${JSON.stringify(payload)}`);
  console.log('prodigi_order_created', { session: session.id, prodigiOrder: payload.order?.id, outcome: payload.outcome });
}

export async function POST(request) {
  const signature = request.headers.get('stripe-signature');
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET || !signature) return new Response('Webhook is not configured', { status: 400 });
  let event;
  try { event = new Stripe(process.env.STRIPE_SECRET_KEY).webhooks.constructEvent(await request.text(), signature, process.env.STRIPE_WEBHOOK_SECRET); }
  catch (error) { return new Response(`Webhook signature failed: ${error.message}`, { status: 400 }); }
  if (event.type === 'checkout.session.completed') {
    try { await placeProdigiOrder(event.data.object, request); }
    catch (error) { console.error('fulfillment_failed', { event: event.id, error: error.message }); return new Response('Fulfillment retry requested', { status: 500 }); }
  }
  return Response.json({ received: true });
}
