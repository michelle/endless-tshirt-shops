import Stripe from 'stripe';

export const config = { api: { bodyParser: false } };
function readRawBody(req: any): Promise<Buffer> {
  if (Buffer.isBuffer(req.body)) return Promise.resolve(req.body);
  if (typeof req.body === 'string') return Promise.resolve(Buffer.from(req.body));
  return new Promise((resolve, reject) => { const chunks: Buffer[] = []; req.on('data', (chunk: Buffer | string) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))); req.on('end', () => resolve(Buffer.concat(chunks))); req.on('error', reject); });
}

async function sendToProdigi(session: Stripe.Checkout.Session, req: any) {
  const apiKey = process.env.PRODIGI_API_KEY;
  if (!apiKey) throw new Error('PRODIGI_API_KEY is not configured');
  const environment = process.env.PRODIGI_ENVIRONMENT === 'live' ? 'live' : 'sandbox';
  const baseUrl = process.env.PRODIGI_BASE_URL || (environment === 'live' ? 'https://api.prodigi.com' : 'https://api.sandbox.prodigi.com');
  const meta = session.metadata ?? {};
  const shipping = session.collected_information?.shipping_details;
  if (!shipping?.address || !shipping.name) throw new Error('Stripe session did not include a shipping address');
  const host = process.env.PUBLIC_SITE_URL || `https://${req.headers['x-forwarded-host'] || req.headers.host}`;
  const artParams = new URLSearchParams({ name: meta.name || '', phrase: meta.phrase || '', badge: meta.badge || 'orbit' });
  const artUrl = `${host}/api/print-art?${artParams.toString()}`;
  const address = shipping.address;
  const payload = { merchantReference: `miy-${session.id}`, idempotencyKey: session.id, shippingMethod: 'Standard', recipient: { name: shipping.name, email: session.customer_details?.email || undefined, phoneNumber: session.customer_details?.phone || undefined, address: { line1: address.line1, line2: address.line2 || undefined, postalOrZipCode: address.postal_code, countryCode: address.country, townOrCity: address.city, stateOrCounty: address.state || undefined } }, items: [{ merchantReference: `miy-shirt-${session.id}`, sku: meta.sku || 'TEE-AS-5001', copies: Math.min(5, Math.max(1, Number(meta.quantity) || 1)), sizing: 'fillPrintArea', attributes: { brand: 'AS Colour', edge: 'Crew neck', color: 'black', gender: "Men's", paperType: '100% cotton', size: (meta.size || 'M').toLowerCase(), style: '5001' }, assets: [{ printArea: 'front', url: artUrl }] }] };
  const response = await fetch(`${baseUrl}/v4.0/Orders`, { method: 'POST', headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const result = await response.json();
  if (!response.ok) throw new Error(`Prodigi ${response.status}: ${JSON.stringify(result)}`);
  return result;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');
  if (!process.env.STRIPE_WEBHOOK_SECRET) return res.status(503).send('Webhook secret is not configured');
  const rawBody = await readRawBody(req);
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
    const event = stripe.webhooks.constructEvent(rawBody, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') { const session = event.data.object as Stripe.Checkout.Session; if (session.payment_status === 'paid') { const result: any = await sendToProdigi(session, req); console.info('prodigi_order_created', { stripeSession: session.id, prodigiOrder: result?.order?.id || result?.id }); } }
    return res.status(200).json({ received: true });
  } catch (error) { console.error('webhook_error', error); return res.status(400).send('Webhook error'); }
}
