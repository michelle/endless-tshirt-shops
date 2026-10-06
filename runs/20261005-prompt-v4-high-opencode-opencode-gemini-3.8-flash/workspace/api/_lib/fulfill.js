'use strict';
const stripe = require('./stripe');
const prodigi = require('./prodigi');
const catalog = require('./catalog');
const { verify } = require('./token');
const { buildProdigiOrder } = require('./spec');

// Warm-instance memo; Prodigi's idempotencyKey is the cross-instance guarantee.
const memo = new Map();

// Verify a paid Checkout Session and, only then, submit it to Prodigi.
// Shared by the success-page poll and the Stripe webhook.
async function fulfillSession(sessionId, origin) {
  if (memo.has(sessionId)) return memo.get(sessionId);

  const session = await stripe.retrieveCheckoutSession(sessionId);
  if (session.payment_status !== 'paid') {
    return { status: 'unpaid', payment_status: session.payment_status };
  }

  const meta = session.metadata || {};
  const expected = Number(meta.subtotal) + Number(meta.shipping);
  if (
    session.mode !== 'payment' ||
    session.currency !== 'usd' ||
    !Number.isFinite(expected) ||
    session.amount_total !== expected
  ) {
    const err = new Error('Payment verification failed');
    err.code = 'verification';
    throw err;
  }

  const spec = verify(meta.spec);
  const color = catalog.color(meta.color);
  const size = catalog.size(meta.size);
  if (!color || !size) {
    const err = new Error('Unknown variant');
    err.code = 'verification';
    throw err;
  }

  const ship =
    session.shipping_details ||
    (session.collected_information && session.collected_information.shipping_details) ||
    {};
  const cust = session.customer_details || {};
  const recipient = {
    name: ship.name || cust.name || 'Customer',
    email: cust.email,
    phone: cust.phone,
    address: ship.address || {},
  };
  if (!recipient.address.line1 || !recipient.address.country) {
    const err = new Error('Shipping address missing from payment');
    err.code = 'verification';
    throw err;
  }

  const order = buildProdigiOrder({
    spec,
    token: meta.spec,
    color,
    size,
    sessionId,
    recipient,
    origin,
  });

  let result;
  try {
    result = await prodigi.createOrder(order);
  } catch (e) {
    if (e.prodigi && e.prodigi.order) result = e.prodigi;
    else throw e;
  }

  const po = (result && result.order) || {};
  const out = {
    status: 'fulfilled',
    prodigiOrderId: po.id || null,
    stage: (po.status && po.status.stage) || null,
    outcome: result && result.outcome,
    color: color.id,
    size: size.id,
    caption: spec.c,
    place: spec.p,
    date: spec.d,
    designUrl: `${origin}/api/design?t=${encodeURIComponent(meta.spec)}`,
  };
  memo.set(sessionId, out);
  return out;
}

// Verify a paid PaymentIntent and, only then, submit it to Prodigi.
async function fulfillPaymentIntent(paymentIntentId, origin) {
  if (memo.has(paymentIntentId)) return memo.get(paymentIntentId);

  const pi = await stripe.retrievePaymentIntent(paymentIntentId);
  if (pi.status !== 'succeeded') {
    return { status: 'unpaid', payment_status: pi.status };
  }

  const meta = pi.metadata || {};
  const spec = verify(meta.spec);
  const color = catalog.color(meta.color);
  const size = catalog.size(meta.size);
  if (!color || !size) {
    const err = new Error('Unknown variant');
    err.code = 'verification';
    throw err;
  }

  let recipient;
  try {
    recipient = JSON.parse(meta.recipient);
  } catch {
    recipient = {
      name: 'Sandbox Customer',
      email: 'customer@example.com',
      address: {
        line1: '123 Main St',
        townOrCity: 'New York',
        stateOrCounty: 'NY',
        postalOrZipCode: '10001',
        countryCode: 'US',
      },
    };
  }

  const order = buildProdigiOrder({
    spec,
    token: meta.spec,
    color,
    size,
    sessionId: paymentIntentId,
    recipient,
    origin,
  });

  let result;
  try {
    result = await prodigi.createOrder(order);
  } catch (e) {
    if (e.prodigi && e.prodigi.order) result = e.prodigi;
    else throw e;
  }

  const po = (result && result.order) || {};
  const out = {
    status: 'fulfilled',
    prodigiOrderId: po.id || null,
    stage: (po.status && po.status.stage) || null,
    outcome: result && result.outcome,
    color: color.id,
    size: size.id,
    caption: spec.c,
    place: spec.p,
    date: spec.d,
    designUrl: `${origin}/api/design?t=${encodeURIComponent(meta.spec)}`,
  };
  memo.set(paymentIntentId, out);
  return out;
}

module.exports = { fulfillSession, fulfillPaymentIntent };
