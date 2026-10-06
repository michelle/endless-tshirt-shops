// Turns a PAID Stripe Checkout Session into a Prodigi order — exactly once.
// Idempotency has two layers:
//  1. the Prodigi order id is recorded on the PaymentIntent and checked first;
//  2. Prodigi's `idempotencyKey` (= the Checkout Session id) makes a duplicate
//     POST return the existing order instead of printing a second shirt.
import { stripe } from './stripe.mjs';
import { createOrder, getOrder, isSandbox } from './prodigi.mjs';
import { SKU, prodigiAttributes } from './spec.mjs';
import { artSign, b64 } from './sign.mjs';

export async function retrieveSession(sessionId) {
  return stripe.retrieveCheckoutSession(sessionId, ['payment_intent', 'line_items']);
}

function shippingOf(session) {
  return session.collected_information?.shipping_details || session.shipping_details || null;
}

export function artUrl(baseUrl, spec) {
  const params = new URLSearchParams({ d: b64.encode(spec), sig: artSign(spec) });
  return `${baseUrl.replace(/\/$/, '')}/api/art?${params}`;
}

/**
 * @returns {{status:'paid_and_sent'|'already_sent'|'unpaid', prodigiOrderId?, prodigiStage?, outcome?}}
 */
export async function fulfillSession(sessionOrId, { baseUrl } = {}) {
  const session = typeof sessionOrId === 'string' ? await retrieveSession(sessionOrId) : sessionOrId;
  const paid = session.payment_status === 'paid' || session.payment_status === 'no_payment_required';
  if (!paid) return { status: 'unpaid' };

  const pi = typeof session.payment_intent === 'string'
    ? await stripe.retrievePaymentIntent(session.payment_intent)
    : session.payment_intent;
  if (pi?.metadata?.prodigi_order_id) {
    return { status: 'already_sent', prodigiOrderId: pi.metadata.prodigi_order_id, prodigiStage: pi.metadata.prodigi_stage };
  }

  const spec = session.metadata?.spec ? JSON.parse(session.metadata.spec) : null;
  if (!spec) throw new Error('Checkout session carries no design spec');
  const base = baseUrl || session.metadata.base_url || process.env.PUBLIC_BASE_URL;
  if (!base) throw new Error('No public base URL available to build the artwork link');
  const art = artUrl(base, spec);

  const ship = shippingOf(session);
  const addr = ship?.address;
  if (!addr || !addr.line1 || !addr.country) throw new Error('Checkout session has no shipping address');
  const cust = session.customer_details || {};

  const order = {
    merchantReference: session.id,
    idempotencyKey: session.id,
    shippingMethod: 'Standard',
    recipient: {
      name: ship.name || cust.name || 'Heliogram customer',
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
      merchantReference: 'heliogram-front',
      sku: SKU,
      copies: spec.qty || 1,
      sizing: 'fitPrintArea',
      attributes: prodigiAttributes(spec),
      assets: [{ printArea: 'front', url: art }],
    }],
    metadata: {
      stripe_session: session.id,
      stripe_payment_intent: pi?.id || '',
      place: [spec.city, spec.admin1, spec.country].filter(Boolean).join(', '),
      dedication: spec.dedication || '',
      shirt: `${spec.shirt} / ${spec.size.toUpperCase()}`,
    },
  };

  let res;
  try {
    res = await createOrder(order);
  } catch (e) {
    if (pi) await stripe.updatePaymentIntent(pi.id, {
      'metadata[fulfillment_error]': String(e.message).slice(0, 480),
      'metadata[fulfillment_error_at]': new Date().toISOString(),
    }).catch(() => {});
    throw e;
  }
  const prodigiOrderId = res.order?.id;
  const stage = res.order?.status?.stage || (res.outcome === 'AlreadyExists' ? 'InProgress' : res.outcome);
  if (pi) {
    await stripe.updatePaymentIntent(pi.id, {
      'metadata[prodigi_order_id]': prodigiOrderId || '',
      'metadata[prodigi_stage]': stage || '',
      'metadata[prodigi_env]': isSandbox() ? 'sandbox' : 'live',
      'metadata[fulfilled_at]': new Date().toISOString(),
      'metadata[art_url]': art.slice(0, 500),
      'metadata[fulfillment_error]': '',
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
