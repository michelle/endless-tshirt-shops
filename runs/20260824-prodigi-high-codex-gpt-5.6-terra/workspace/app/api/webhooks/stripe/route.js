import Stripe from 'stripe';

export const runtime = 'nodejs';
const productFor = { fitted: 'GLOBAL-TEE-GIL-64000L', unisex: 'GLOBAL-TEE-BC-3005' };
const acceptableSizes = new Set(['S', 'M', 'L', 'XL', '2XL']);

function addressFor(session) {
  const shipping = session.shipping_details || session.collected_information?.shipping_details;
  const address = shipping?.address || session.customer_details?.address;
  const name = shipping?.name || session.customer_details?.name;
  if (!name || !address?.line1 || !address?.city || !address?.postal_code || !address?.country) throw new Error('Stripe session does not include a complete shipping address.');
  return { name, address: { line1: address.line1, line2: address.line2 || undefined, townOrCity: address.city, stateOrCounty: address.state || undefined, postalOrZipCode: address.postal_code, countryCode: address.country } };
}

async function submitToProdigi(session) {
  const { timestamp, style, size } = session.metadata || {};
  if (!/^\d{13}$/.test(timestamp || '') || !productFor[style] || !acceptableSizes.has(size)) throw new Error('Invalid fulfillment metadata.');
  if (!process.env.PRODIGI_API_KEY || !process.env.PUBLIC_APP_URL) throw new Error('Prodigi or public asset URL is not configured.');
  const response = await fetch(`${process.env.PRODIGI_API_BASE || 'https://api.sandbox.prodigi.com/v4.0'}/Orders`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-Key': process.env.PRODIGI_API_KEY },
    body: JSON.stringify({
      merchantReference: `datetime-${session.id}`, idempotencyKey: session.id, shippingMethod: 'Budget',
      recipient: { ...addressFor(session), email: session.customer_details?.email, phoneNumber: session.customer_details?.phone || undefined },
      items: [{ merchantReference: session.id, sku: productFor[style], copies: 1, sizing: 'fillPrintArea', attributes: { color: 'black', size: size.toLowerCase() }, assets: [{ printArea: 'front', url: `${process.env.PUBLIC_APP_URL}/api/artwork?timestamp=${timestamp}` }] }],
    }),
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Prodigi ${response.status}: ${body.slice(0, 1000)}`);
  console.info('prodigi_order_created', session.id, body.slice(0, 500));
}

export async function POST(request) {
  const signature = request.headers.get('stripe-signature');
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET || !signature) return new Response('Webhook is not configured.', { status: 400 });
  let event;
  try { event = new Stripe(process.env.STRIPE_SECRET_KEY).webhooks.constructEvent(await request.text(), signature, process.env.STRIPE_WEBHOOK_SECRET); }
  catch (error) { return new Response(`Webhook Error: ${error.message}`, { status: 400 }); }
  if (event.type === 'checkout.session.completed') {
    try { await submitToProdigi(event.data.object); }
    catch (error) {
      console.error('prodigi_fulfillment_failed', event.data.object.id, error.message);
      return new Response('Fulfillment failed; please retry.', { status: 500 });
    }
  }
  return Response.json({ received: true });
}
