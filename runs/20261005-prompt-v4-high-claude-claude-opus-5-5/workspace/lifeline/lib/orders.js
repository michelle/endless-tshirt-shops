// Order lifecycle. Stripe is the system of record: the design and shirt choice
// live in Checkout Session metadata, and the Prodigi order id is written back to
// the PaymentIntent. Fulfilment is idempotent (Prodigi idempotencyKey = session id),
// so the webhook and the success page can both safely trigger it.
import { stripe } from './stripe.js';
import { createOrder, getOrder } from './prodigi.js';
import { printUrl } from './sign.js';
import { PRODUCT, shirtColor, validateDesign, validateOrder } from '../public/catalog.js';

const CHUNK = 480; // Stripe metadata values max out at 500 chars

export function packMetadata({ design, shirt, items, country, base }) {
  const json = JSON.stringify(design);
  const meta = { shirt, items: JSON.stringify(items), country, base, design_chunks: 0 };
  for (let i = 0; i * CHUNK < json.length; i++) {
    meta[`design_${i}`] = json.slice(i * CHUNK, (i + 1) * CHUNK);
    meta.design_chunks = i + 1;
  }
  return meta;
}

export function unpackMetadata(meta) {
  let json = '';
  for (let i = 0; i < Number(meta.design_chunks || 0); i++) json += meta[`design_${i}`] ?? '';
  const design = validateDesign(JSON.parse(json)).design;
  const { items } = validateOrder({ shirt: meta.shirt, items: JSON.parse(meta.items), country: meta.country });
  return { design, shirt: meta.shirt, items, country: meta.country, base: meta.base };
}

async function loadSession(sessionId) {
  return stripe('GET', `/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    expand: ['payment_intent', 'shipping_cost.shipping_rate'],
  });
}

function shippingDetails(session) {
  return session.collected_information?.shipping_details ?? session.shipping_details ?? null;
}

function recipientFrom(session) {
  const ship = shippingDetails(session);
  const a = ship?.address ?? {};
  return {
    name: ship?.name || session.customer_details?.name || 'Customer',
    email: session.customer_details?.email || undefined,
    phoneNumber: session.customer_details?.phone || undefined,
    address: {
      line1: a.line1,
      line2: a.line2 || undefined,
      postalOrZipCode: a.postal_code || '',
      countryCode: a.country,
      townOrCity: a.city || a.state || '',
      stateOrCounty: a.state || undefined,
    },
  };
}

// Creates the Prodigi order for a paid session if it doesn't exist yet.
// Returns { session, order, prodigiOrderId }.
export async function fulfil(sessionId) {
  const session = await loadSession(sessionId);
  const pi = session.payment_intent;
  const order = unpackMetadata(session.metadata);
  if (session.payment_status !== 'paid') return { session, order, prodigiOrderId: null };

  const existing = pi?.metadata?.prodigi_order_id;
  if (existing) return { session, order, prodigiOrderId: existing };

  const method = session.shipping_cost?.shipping_rate?.metadata?.prodigi_method || 'Standard';
  const color = shirtColor(order.shirt);
  const assetUrl = printUrl(order.base, order.design, order.shirt);
  const res = await createOrder({
    merchantReference: session.id.slice(0, 60),
    idempotencyKey: session.id,
    shippingMethod: method,
    recipient: recipientFrom(session),
    items: order.items.map((it) => ({
      merchantReference: `${order.shirt}-${it.size}`,
      sku: PRODUCT.sku,
      copies: it.qty,
      sizing: 'fillPrintArea',
      attributes: { color: color.prodigi, size: it.size },
      assets: [{ printArea: 'front', url: assetUrl }],
    })),
    metadata: { stripeCheckoutSession: session.id, line: order.design.name },
  });
  const prodigiOrderId = res.order?.id;
  if (!prodigiOrderId) throw new Error(`Prodigi returned no order id (${res.outcome})`);
  console.log(`fulfilled ${session.id} → ${prodigiOrderId} (${res.outcome})`);

  if (pi?.id) {
    await stripe('POST', `/payment_intents/${pi.id}`, {
      metadata: { prodigi_order_id: prodigiOrderId, prodigi_outcome: res.outcome },
    });
  }
  return { session, order, prodigiOrderId };
}

// Public, non-sensitive order summary for the confirmation page.
export async function orderStatus(sessionId) {
  let result;
  let fulfilmentError = null;
  try {
    result = await fulfil(sessionId);
  } catch (e) {
    console.error('fulfil failed', sessionId, e);
    fulfilmentError = 'We couldn’t reach the print shop yet — we’ll retry automatically.';
    const session = await loadSession(sessionId);
    result = { session, order: unpackMetadata(session.metadata), prodigiOrderId: null };
  }
  const { session, order, prodigiOrderId } = result;

  let prodigi = null;
  if (prodigiOrderId) {
    try {
      const p = await getOrder(prodigiOrderId);
      prodigi = {
        id: prodigiOrderId,
        stage: p.order?.status?.stage,
        shipments: (p.order?.shipments ?? []).map((s) => ({
          carrier: s.carrier?.name, tracking: s.tracking?.number, url: s.tracking?.url, status: s.status,
        })),
      };
    } catch {
      prodigi = { id: prodigiOrderId, stage: 'Submitted' };
    }
  }

  const ship = shippingDetails(session);
  return {
    paid: session.payment_status === 'paid',
    paymentStatus: session.payment_status,
    email: session.customer_details?.email ?? null,
    shipTo: ship ? { name: ship.name, city: ship.address?.city, country: ship.address?.country } : null,
    total: session.amount_total,
    currency: session.currency,
    shippingMethod: session.shipping_cost?.shipping_rate?.metadata?.prodigi_method ?? null,
    design: order.design,
    shirt: order.shirt,
    items: order.items,
    printFile: printUrl(order.base, order.design, order.shirt),
    prodigi,
    fulfilmentError,
  };
}
