import Stripe from 'stripe';

export const config = { api: { bodyParser: false } };

async function rawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function normalizedAddress(address) {
  return {
    line1: address.line1,
    line2: address.line2 || undefined,
    townOrCity: address.city,
    stateOrCounty: address.state || undefined,
    postalOrZipCode: address.postal_code,
    countryCode: address.country,
  };
}

async function sendToProdigi(session, origin) {
  if (!process.env.PRODIGI_API_KEY) throw new Error('PRODIGI_API_KEY is missing');
  const shipping = session.shipping_details;
  if (!shipping?.address) throw new Error('Shipping details missing from paid checkout session');
  const metadata = session.metadata || {};
  const baseUrl = (process.env.PRODIGI_BASE_URL || 'https://api.sandbox.prodigi.com').replace(/\/$/, '');
  const payload = {
    merchantReference: `datetime-${session.id}`,
    idempotencyKey: `datetime-${session.id}`,
    shippingMethod: 'Budget',
    recipient: {
      name: shipping.name || session.customer_details?.name || 'datetime.store customer',
      email: session.customer_details?.email || undefined,
      phoneNumber: session.customer_details?.phone || undefined,
      address: normalizedAddress(shipping.address),
    },
    items: [{
      sku: metadata.productSku || 'GLOBAL-TEE-BC-3001',
      copies: 1,
      sizing: 'fitPrintArea',
      attributes: {
        brand: 'Bella + Canvas',
        edge: 'Crew neck',
        color: 'black',
        gender: 'Unisex',
        paperType: '100% cotton',
        size: String(metadata.size || 'M').toLowerCase(),
        style: '3001',
      },
      assets: [{ printArea: 'front', url: metadata.artworkUrl }],
    }],
    metadata: { stripeSessionId: session.id, timestamp: metadata.timestamp || '' },
  };
  const response = await fetch(`${baseUrl}/v4.0/Orders`, {
    method: 'POST',
    headers: { 'X-API-Key': process.env.PRODIGI_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('prodigi_order_error', response.status, JSON.stringify(result));
    throw new Error(`Prodigi order failed with status ${response.status}`);
  }
  console.log('prodigi_order_created', result.id || result.order?.id || 'unknown');
  return result;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) return res.status(503).send('Webhook is not configured');
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  let event;
  try {
    const body = await rawBody(req);
    event = stripe.webhooks.constructEvent(body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    console.error('stripe_webhook_signature_error', error.message);
    return res.status(400).send('Invalid signature');
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    if (session.payment_status === 'paid' || session.payment_status === 'no_payment_required') {
      try {
        const origin = process.env.PUBLIC_SITE_URL || `https://${req.headers.host}`;
        await sendToProdigi(session, origin);
      } catch (error) {
        console.error('fulfillment_error', error);
        return res.status(500).send('Fulfillment failed; Stripe will retry this event');
      }
    }
  }
  return res.status(200).json({ received: true });
}
