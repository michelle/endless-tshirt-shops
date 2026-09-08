import crypto from 'node:crypto';
import { normalizeDesign, PRODUCT_SKU, submitToProdigi, stripeRequest } from '../lib/store.js';

export const config = { api: { bodyParser: false } };

async function rawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return Buffer.from(req.body);
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function verifySignature(payload, signature, secret) {
  if (!signature || !secret) return false;
  const values = Object.fromEntries(signature.split(',').map((part) => part.split('=')));
  if (!values.t || !values.v1) return false;
  if (Math.abs(Date.now() / 1000 - Number(values.t)) > 300) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${values.t}.${payload}`).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(values.v1));
}

async function fulfill(session) {
  const count = Number.parseInt(session.metadata?.item_count || '1', 10);
  const lineItems = [];
  for (let index = 0; index < count; index += 1) {
    const item = JSON.parse(session.metadata?.[`design_${index}`] || '{}');
    const design = normalizeDesign(item);
    lineItems.push({ design, quantity: Math.max(1, Number.parseInt(item.quantity, 10) || 1), artwork: item.artwork });
  }
  const address = session.shipping_details?.address;
  const recipient = session.shipping_details;
  if (!address || !recipient?.name) throw new Error('Checkout session has no shipping address.');
  const order = {
    merchantReference: `signal-bloom-${session.id}`,
    idempotencyKey: `stripe-${session.id}`,
    shippingMethod: 'Standard',
    recipient: {
      name: recipient.name,
      email: session.customer_details?.email || undefined,
      address: {
        line1: address.line1,
        line2: address.line2 || undefined,
        postalOrZipCode: address.postal_code,
        countryCode: address.country,
        townOrCity: address.city,
        stateOrCounty: address.state || undefined,
      },
    },
    items: lineItems.map(({ design, quantity, artwork }) => ({
      merchantReference: `${session.id}-${design.shirtSize}-${design.shirtColor}`,
      sku: PRODUCT_SKU,
      copies: quantity,
      sizing: 'fitPrintArea',
      attributes: { color: design.shirtColor, size: design.shirtSize },
      assets: [{ printArea: 'front', url: artwork }],
      recipientCost: { amount: '34.00', currency: 'USD' },
    })),
    metadata: { paymentProvider: 'stripe', checkoutSession: session.id, theme: 'signal-bloom' },
  };
  const result = await submitToProdigi(order);
  console.log('[prodigi] fulfilled', { session: session.id, outcome: result.outcome, orderId: result.order?.id });
  return result;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');
  try {
    const payload = await rawBody(req);
    if (!verifySignature(payload, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET)) return res.status(400).send('Invalid signature');
    const event = JSON.parse(payload.toString('utf8'));
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object;
      if (session.payment_status === 'paid' || event.type === 'checkout.session.async_payment_succeeded') await fulfill(session);
    }
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('[stripe-webhook]', error);
    return res.status(500).send('Webhook processing failed; Stripe will retry.');
  }
}
