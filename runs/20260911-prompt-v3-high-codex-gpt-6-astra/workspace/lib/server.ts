import { createHmac, timingSafeEqual } from 'node:crypto';
import Stripe from 'stripe';
import { designSchema, orderSchema, PRICE, SHIPPING, SKU } from './design';
export const APP = 'after-hours-v1';
export function stripe() {
  if (!process.env.STRIPE_SECRET_KEY)
    throw new Error('Payment account is not connected.');
  return new Stripe(process.env.STRIPE_SECRET_KEY, { maxNetworkRetries: 2 });
}
export function origin() {
  const value = process.env.APP_URL;
  if (!value || !/^https:\/\/[a-z0-9.-]+$/.test(value))
    throw new Error('Store URL is not configured.');
  return value;
}
function secret() {
  if (
    !process.env.ORDER_SIGNING_SECRET ||
    process.env.ORDER_SIGNING_SECRET.length < 32
  )
    throw new Error('Order signing is not configured.');
  return process.env.ORDER_SIGNING_SECRET;
}
export function sign(value: unknown) {
  const payload = Buffer.from(JSON.stringify(value)).toString('base64url');
  return (
    payload +
    '.' +
    createHmac('sha256', secret()).update(payload).digest('base64url')
  );
}
export function verify(token: string): unknown {
  if (token.length > 4000) throw new Error('Invalid order link.');
  const [p, s, ...rest] = token.split('.');
  if (!p || !s || rest.length) throw new Error('Invalid order link.');
  const expected = createHmac('sha256', secret()).update(p).digest();
  const actual = Buffer.from(s, 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    throw new Error('Invalid order link.');
  return JSON.parse(Buffer.from(p, 'base64url').toString());
}
export function fulfillmentMode() {
  const live = process.env.PRODIGI_ENV === 'live';
  const key = process.env.STRIPE_SECRET_KEY || '';
  if (
    live &&
    (!key.startsWith('sk_live_') ||
      process.env.ENABLE_LIVE_FULFILLMENT !== 'true' ||
      !process.env.SUPPORT_EMAIL ||
      process.env.STRIPE_AUTOMATIC_TAX !== 'true')
  )
    throw new Error('Live sales are not fully configured.');
  if (!live && key.startsWith('sk_live_'))
    throw new Error('Live payments cannot use sandbox printing.');
  return live;
}
export function requireCheckoutConfig() {
  stripe();
  origin();
  secret();
  fulfillmentMode();
  if (!process.env.STRIPE_WEBHOOK_SECRET || !process.env.PRODIGI_API_KEY)
    throw new Error(
      'Checkout is not available yet. The store owner needs to finish connecting payments.',
    );
}
export function paidOrder(session: Stripe.Checkout.Session) {
  if (session.payment_status !== 'paid' || session.status !== 'complete')
    throw new Error('Order has not been paid.');
  if (session.metadata?.app !== APP) throw new Error('Unknown store order.');
  const order = orderSchema.parse(JSON.parse(session.metadata.order));
  const expected = PRICE * order.quantity;
  if (
    session.currency !== 'usd' ||
    session.amount_subtotal !== expected ||
    session.total_details?.amount_shipping !== SHIPPING ||
    session.total_details?.amount_discount !== 0 ||
    session.amount_total !==
      expected + SHIPPING + (session.total_details?.amount_tax || 0)
  )
    throw new Error('Order total verification failed.');
  const live = fulfillmentMode();
  if (session.livemode !== live)
    throw new Error('Payment and print environments do not match.');
  return order;
}
export function shipping(session: Stripe.Checkout.Session) {
  const s = session as Stripe.Checkout.Session & {
    shipping_details?: { name: string; address: Stripe.Address };
    collected_information?: {
      shipping_details?: { name: string; address: Stripe.Address };
    };
  };
  const details =
    s.collected_information?.shipping_details || s.shipping_details;
  const a = details?.address;
  if (
    !details?.name ||
    !a?.line1 ||
    !a.city ||
    !a.postal_code ||
    a.country !== 'US' ||
    !a.state
  )
    throw new Error('Valid US shipping details are required.');
  return {
    name: details.name,
    email: session.customer_details?.email,
    phoneNumber: session.customer_details?.phone,
    address: {
      line1: a.line1,
      ...(a.line2?.trim() ? { line2: a.line2 } : {}),
      townOrCity: a.city,
      postalOrZipCode: a.postal_code,
      countryCode: a.country,
      stateOrCounty: a.state,
    },
  };
}
export async function prodigi(path: string, body?: unknown) {
  if (!process.env.PRODIGI_API_KEY)
    throw new Error('Print service is not configured.');
  const base =
    process.env.PRODIGI_ENV === 'live'
      ? 'https://api.prodigi.com'
      : 'https://api.sandbox.prodigi.com';
  const r = await fetch(`${base}/v4.0/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      'X-API-Key': process.env.PRODIGI_API_KEY,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(25000),
    cache: 'no-store',
  });
  const data = await r.json();
  if (!r.ok)
    throw new Error(
      `Print service error (${r.status}, ${data.outcome || 'unknown'}).`,
    );
  return data;
}
export async function fulfill(sessionId: string, client = stripe()) {
  const session = await client.checkout.sessions.retrieve(sessionId, {
    expand: ['payment_intent'],
  });
  const order = paidOrder(session);
  const pi = session.payment_intent as Stripe.PaymentIntent;
  if (!pi || pi.status !== 'succeeded')
    throw new Error('Payment has not succeeded.');
  if (session.metadata?.prodigiOrderId)
    return { id: session.metadata.prodigiOrderId, existing: true };
  const charge = pi.latest_charge
    ? await client.charges.retrieve(
        typeof pi.latest_charge === 'string'
          ? pi.latest_charge
          : pi.latest_charge.id,
      )
    : null;
  if (
    !charge ||
    charge.refunded ||
    charge.amount_refunded > 0 ||
    charge.disputed
  )
    throw new Error('Refunded or disputed orders require manual review.');
  const asset = sign({ v: 1, design: order.design });
  const payload = {
    merchantReference: session.id,
    idempotencyKey: session.id,
    shippingMethod: 'Standard',
    recipient: shipping(session),
    items: [
      {
        merchantReference: order.requestId,
        sku: SKU,
        copies: order.quantity,
        sizing: 'fitPrintArea',
        attributes: { color: 'black', size: order.size },
        assets: [
          {
            printArea: 'front',
            url: `${origin()}/api/artwork?token=${encodeURIComponent(asset)}`,
          },
        ],
      },
    ],
    metadata: { store: APP, checkoutSession: session.id, artworkVersion: 1 },
  };
  try {
    const result = await prodigi('orders', payload);
    if (!result.order?.id)
      throw new Error('Print service did not return an order reference.');
    await client.checkout.sessions.update(session.id, {
      metadata: {
        prodigiOrderId: result.order.id,
        fulfillment: 'submitted',
        fulfillmentError: '',
      },
    });
    return { id: result.order.id, existing: false };
  } catch (e) {
    await client.checkout.sessions
      .update(session.id, {
        metadata: {
          fulfillment: 'retry_required',
          fulfillmentError: (e as Error).message.slice(0, 200),
        },
      })
      .catch(() => {});
    throw e;
  }
}
export function parseAsset(token: string) {
  const v = verify(token) as { v: number; design: unknown };
  if (v.v !== 1) throw new Error('Unknown artwork version.');
  return designSchema.parse(v.design);
}
export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}
