// Turns a *paid* Stripe Checkout Session into a Prodigi print order — exactly once.
//
// Idempotency has two layers:
//  1. We record the Prodigi order id on the PaymentIntent's metadata and check it first.
//  2. Prodigi's own `idempotencyKey` (= the Checkout Session id) makes a duplicate POST
//     return the existing order instead of printing a second shirt.
import { stripe } from './stripe.js';
import { createOrder, getOrder, isSandbox } from './prodigi.js';
import { specFromMetadata, artUrl, SKU } from './spec.js';
import { SHIRTS } from '../public/lib/dayprint.js';

export async function retrieveSession(sessionId) {
  return stripe().checkout.sessions.retrieve(sessionId, { expand: ['payment_intent', 'line_items'] });
}

function shippingOf(session) {
  // Stripe moved shipping details between API versions; accept both shapes.
  return session.collected_information?.shipping_details || session.shipping_details || null;
}

/**
 * @returns {Promise<{status:'paid_and_sent'|'already_sent'|'unpaid', prodigiOrderId?:string, prodigiStage?:string}>}
 */
export async function fulfillSession(sessionOrId, { baseUrl } = {}) {
  const session = typeof sessionOrId === 'string' ? await retrieveSession(sessionOrId) : sessionOrId;
  const paid = session.payment_status === 'paid' || session.payment_status === 'no_payment_required';
  if (!paid) return { status: 'unpaid' };

  const pi = typeof session.payment_intent === 'string'
    ? await stripe().paymentIntents.retrieve(session.payment_intent)
    : session.payment_intent;
  if (pi?.metadata?.prodigi_order_id) {
    return { status: 'already_sent', prodigiOrderId: pi.metadata.prodigi_order_id, prodigiStage: pi.metadata.prodigi_stage };
  }

  const spec = specFromMetadata(session.metadata);
  const base = baseUrl || session.metadata.base_url || process.env.PUBLIC_BASE_URL;
  if (!base) throw new Error('No public base URL available to build the artwork link');
  const art = artUrl(base, spec);

  const ship = shippingOf(session);
  const addr = ship?.address;
  if (!addr || !addr.line1 || !addr.country) throw new Error('Checkout session has no shipping address');
  const cust = session.customer_details || {};
  const quantity = session.line_items?.data?.[0]?.quantity || 1;

  const order = {
    merchantReference: session.id,
    idempotencyKey: session.id,
    shippingMethod: 'Standard',
    recipient: {
      name: ship.name || cust.name || 'Dayprint customer',
      email: cust.email || undefined,
      phoneNumber: cust.phone || undefined,
      address: {
        line1: addr.line1,
        line2: addr.line2 || undefined,
        postalOrZipCode: addr.postal_code || '',
        countryCode: addr.country,
        townOrCity: addr.city || '',
        stateOrCounty: addr.state || undefined,
      },
    },
    items: [{
      merchantReference: 'dayprint-front',
      sku: SKU,
      copies: quantity,
      sizing: 'fitPrintArea',
      attributes: { color: spec.shirt, size: spec.size },
      assets: [{ printArea: 'front', url: art }],
    }],
    metadata: {
      stripe_session: session.id,
      stripe_payment_intent: pi?.id || '',
      place: [spec.place.name, spec.place.admin1, spec.place.country].filter(Boolean).join(', '),
      date: spec.date,
      caption: spec.caption,
      shirt: `${SHIRTS[spec.shirt].label} / ${spec.size.toUpperCase()}`,
    },
  };

  let res;
  try {
    res = await createOrder(order);
  } catch (e) {
    if (pi) await stripe().paymentIntents.update(pi.id, { metadata: { fulfillment_error: String(e.message).slice(0, 480), fulfillment_error_at: new Date().toISOString() } }).catch(() => {});
    throw e;
  }
  const prodigiOrderId = res.order?.id;
  const stage = res.order?.status?.stage || (res.outcome === 'AlreadyExists' ? 'InProgress' : res.outcome);
  if (pi) {
    await stripe().paymentIntents.update(pi.id, {
      metadata: {
        prodigi_order_id: prodigiOrderId,
        prodigi_stage: stage,
        prodigi_env: isSandbox() ? 'sandbox' : 'live',
        fulfilled_at: new Date().toISOString(),
        art_url: art.slice(0, 500),
        fulfillment_error: '',
      },
    });
  }
  return { status: 'paid_and_sent', prodigiOrderId, prodigiStage: stage, outcome: res.outcome };
}

export async function prodigiStatus(orderId) {
  try {
    const r = await getOrder(orderId);
    const o = r.order || {};
    return {
      id: o.id,
      stage: o.status?.stage,
      details: o.status?.details,
      issues: o.status?.issues || [],
      shipments: (o.shipments || []).map((s) => ({ carrier: s.carrier?.name, tracking: s.tracking?.url, status: s.status })),
      created: o.created,
    };
  } catch (e) {
    return { id: orderId, error: e.message };
  }
}
