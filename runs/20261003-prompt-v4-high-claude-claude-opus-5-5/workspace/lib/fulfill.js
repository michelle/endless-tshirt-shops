import { getStripe, PRODUCT, PRODIGI_BASE } from './config.js';
import { GARMENTS, unpackDesign } from '../public/js/design.js';
import { printUrl } from './sign.js';

export const parseSizes = (s) =>
  String(s || '')
    .split(',')
    .map((p) => p.split(':'))
    .filter(([size, n]) => size && +n > 0)
    .map(([size, n]) => ({ size, copies: +n }));

async function prodigi(path, init = {}) {
  const res = await fetch(`${PRODIGI_BASE}${path}`, {
    ...init,
    headers: { 'X-API-Key': process.env.PRODIGI_API_KEY, 'Content-Type': 'application/json', ...init.headers },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

export async function getProdigiOrder(id) {
  const { status, body } = await prodigi(`/orders/${id}`);
  return status === 200 ? body.order : null;
}

export async function loadSession(sessionId) {
  return getStripe().checkout.sessions.retrieve(sessionId, {
    expand: ['payment_intent', 'shipping_cost.shipping_rate'],
  });
}

/**
 * Sends a paid Checkout Session to Prodigi exactly once.
 * Safe to call repeatedly / concurrently (webhook + order page): payment is
 * re-checked against Stripe, and Prodigi dedupes on idempotencyKey = session id.
 */
export async function fulfillSession(sessionId, base) {
  const stripe = getStripe();
  const session = await loadSession(sessionId);
  if (session.metadata?.kind !== 'transit-tee') return { state: 'ignored' };
  if (session.payment_status !== 'paid') return { state: 'awaiting_payment', session };

  const pi = session.payment_intent;
  if (pi?.metadata?.prodigi_order_id) return { state: 'submitted', prodigiOrderId: pi.metadata.prodigi_order_id, session };

  const ship = session.collected_information?.shipping_details || session.shipping_details;
  const addr = ship?.address;
  if (!addr) throw new Error(`Session ${sessionId} has no shipping address`);
  const design = unpackDesign(session.metadata);
  const garment = GARMENTS[session.metadata.garment];
  const method = session.shipping_cost?.shipping_rate?.metadata?.prodigi || 'Standard';
  const asset = printUrl(base, session.id);

  const order = {
    merchantReference: session.id,
    idempotencyKey: session.id,
    shippingMethod: method,
    recipient: {
      name: ship.name || session.customer_details?.name,
      email: session.customer_details?.email || undefined,
      phoneNumber: session.customer_details?.phone || undefined,
      address: {
        line1: addr.line1,
        line2: addr.line2 || undefined,
        postalOrZipCode: addr.postal_code || '',
        countryCode: addr.country,
        townOrCity: addr.city || addr.state || '',
        stateOrCounty: addr.state || undefined,
      },
    },
    items: parseSizes(session.metadata.sizes).map(({ size, copies }) => ({
      merchantReference: `${session.id}-${size}`,
      sku: PRODUCT.sku,
      copies,
      sizing: 'fitPrintArea',
      attributes: { color: garment.prodigi, size: size.toLowerCase() },
      assets: [{ printArea: 'front', url: asset }],
    })),
    metadata: { stripeSession: session.id, design: design.title },
  };

  const { status, body } = await prodigi('/orders', { method: 'POST', body: JSON.stringify(order) });
  const id = body?.order?.id;
  if (!id || !['Created', 'CreatedWithIssues', 'AlreadyExists'].includes(body.outcome)) {
    throw new Error(`Prodigi order failed (${status}): ${JSON.stringify(body).slice(0, 500)}`);
  }
  await stripe.paymentIntents.update(pi.id, { metadata: { prodigi_order_id: id } });
  console.log(`fulfilled ${session.id} -> ${id} (${body.outcome})`);
  return { state: 'submitted', prodigiOrderId: id, session };
}
