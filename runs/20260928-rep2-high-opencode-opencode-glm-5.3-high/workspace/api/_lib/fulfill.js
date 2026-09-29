// Fulfillment — the only path that sends an order to Prodigi, and it runs
// exclusively after Stripe says the session is paid. Both triggers (the
// order-status endpoint the success page polls, and the checkout.session
// .completed webhook) converge here, guarded three ways:
//
//   1. payment_status === 'paid' is re-fetched from Stripe on every call,
//      never taken from the client;
//   2. the Prodigi order carries an idempotency key derived from the Stripe
//      payment intent, so concurrent or retried attempts collapse into one
//      physical order;
//   3. the payment intent's metadata records the Prodigi order id as a
//      fast-path "already fulfilled" marker.
import { retrieveCheckoutSession, updatePaymentIntentMetadata } from './stripe.js';
import { createProdigiOrder, listProdigiOrders, prodigiOrderBody } from './prodigi.js';
import { orderFromMetadata } from './validate.js';

// Rehydrates the design in the renderer's spec shape from the compact
// Stripe metadata form (read-only — fulfillment always re-reads this
// after payment, never the client).
function designSpecFromMetadata(design) {
  return {
    lat: design.lat,
    lng: design.lng,
    wallISO: design.t || design.wallISO,
    timezone: design.tz || design.timezone,
    title: design.ti || design.title,
    placeLabel: design.pl || design.placeLabel,
    theme: design.th || design.theme,
    showMoon: Boolean(design.m ?? design.showMoon),
    showLines: Boolean(design.l ?? design.showLines),
  };
}

export async function fulfillSession(sessionId, { log = () => {} } = {}) {
  // 1. Ask Stripe for the truth, expanded with the payment intent.
  const session = await retrieveCheckoutSession(sessionId, ['payment_intent']);
  if (!session.ok) {
    return { ok: false, stage: 'stripe', error: 'could not load the checkout session' };
  }
  const s = session.data;

  // 2. Only paid orders are ever fulfilled. Unpaid means the customer is
  //    still on (or never reached) the Stripe page — nothing is sent on.
  if (s.payment_status !== 'paid') {
    return { ok: true, status: 'unpaid', paymentStatus: s.payment_status, sessionStatus: s.status };
  }

  const paymentIntent =
    typeof s.payment_intent === 'object' ? s.payment_intent : { id: null, metadata: {} };
  const piId = paymentIntent.id;

  // 3. Fast path: this payment was already fulfilled.
  const existing = paymentIntent.metadata?.ns_order || paymentIntent.metadata?.ns_order_id;
  if (existing) {
    return { ok: true, status: 'fulfilled', orderId: existing, repeat: true };
  }

  const order = orderFromMetadata(s.metadata);
  if (!order) {
    log({ sessionId, error: 'order metadata incomplete' });
    return { ok: false, stage: 'metadata', error: 'this order is missing its design metadata' };
  }
  const designSpec = designSpecFromMetadata(order.design);

  // The email the customer used at payment, for Prodigi's shipping notices.
  order.address.email = s.customer_details?.email || order.address.email;

  // 4. Create the Prodigi order, idempotent on the Stripe payment.
  const merchantReference = `stripe-${sessionId}`;
  const idempotencyKey = piId ? `pi-${piId}` : `cs-${sessionId}`;
  const body = prodigiOrderBody(order, {
    merchantReference,
    idempotencyKey,
    orderKey: `tee-${sessionId.slice(-12)}`,
  });
  let created = await createProdigiOrder(body);
  let orderId = created.ok ? created.data?.order?.id : null;
  let prodigiStage = created.data?.order?.status?.stage || null;

  if (!orderId) {
    // The create failed. Most likely a raced duplicate of this exact order
    // (same idempotency key) — look it up rather than create a second one.
    const listed = await listProdigiOrders({ merchantReference });
    const mine = (listed.data?.orders || []).find((o) => o.recipient?.name === order.address.name);
    if (mine) {
      orderId = mine.id;
      prodigiStage = mine.status?.stage || prodigiStage;
      created = { ok: true, raced: true };
    }
  }

  if (!orderId) {
    log({ sessionId, prodigi: created.data, error: 'prodigi order creation failed' });
    return {
      ok: false,
      stage: 'prodigi',
      error: 'payment received, but sending the order to the print lab failed',
      paid: true,
    };
  }

  // 5. Record the marker (best effort; the idempotency key already guards
  //    against duplicates even if this write fails).
  if (piId) {
    await updatePaymentIntentMetadata(piId, { ns_order: orderId });
  }
  log({ sessionId, orderId, fulfilled: true });

  return {
    ok: true,
    status: 'fulfilled',
    orderId,
    prodigiStage,
    email: order.address.email,
    design: designSpec,
    garment: order.garment,
  };
}
