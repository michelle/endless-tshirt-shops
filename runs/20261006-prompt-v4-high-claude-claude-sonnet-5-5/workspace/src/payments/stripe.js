'use strict';
const Stripe = require('stripe');
const config = require('../config');
const { sign } = require('../sign');
const { openOrder } = require('../orders');
const { UNIT_PRICE_CENTS } = require('../catalog');
const { prettyDate } = require('../design/params');

let client;
const stripe = () => (client ||= new Stripe(config.stripe.secretKey));

const CHUNK = 480;

function chunkToken(token) {
  const meta = {};
  for (let i = 0; i * CHUNK < token.length; i++) meta[`o${i}`] = token.slice(i * CHUNK, (i + 1) * CHUNK);
  return meta;
}

function tokenFromMetadata(meta = {}) {
  let out = '';
  for (let i = 0; meta[`o${i}`] !== undefined; i++) out += meta[`o${i}`];
  return out;
}

async function createCheckout(order, token) {
  const line_items = order.items.map((it) => ({
    quantity: it.q,
    price_data: {
      currency: order.currency,
      unit_amount: UNIT_PRICE_CENTS,
      product_data: {
        name: `Constellation Tee: ${it.d.name}`,
        description: `${it.c}, size ${it.s.toUpperCase()}${it.d.date ? ' · ' + prettyDate(it.d.date) : ''}`,
      },
    },
  }));
  const session = await stripe().checkout.sessions.create({
    mode: 'payment',
    line_items,
    shipping_options: [{
      shipping_rate_data: {
        type: 'fixed_amount',
        fixed_amount: { amount: order.shipping, currency: order.currency },
        display_name: `Standard shipping to ${order.recipient.country}`,
        delivery_estimate: { minimum: { unit: 'business_day', value: 6 }, maximum: { unit: 'business_day', value: 14 } },
      },
    }],
    customer_email: order.recipient.email,
    client_reference_id: order.id,
    metadata: { orderId: order.id, ...chunkToken(token) },
    payment_intent_data: { metadata: { orderId: order.id }, description: `Asterism order ${order.id}` },
    success_url: `${order.origin}/order.html?sid={CHECKOUT_SESSION_ID}`,
    cancel_url: `${order.origin}/checkout.html?cancelled=1`,
  });
  return { redirectUrl: session.url, sessionId: session.id };
}

function constructEvent(rawBody, signature) {
  return stripe().webhooks.constructEvent(rawBody, signature, config.stripe.webhookSecret);
}

async function retrieveSession(id) {
  return stripe().checkout.sessions.retrieve(id);
}

// Returns the verified order only when Stripe says the money has been collected.
function orderIfPaid(session) {
  if (!session || session.payment_status !== 'paid') return null;
  const order = openOrder(tokenFromMetadata(session.metadata));
  if (!order) throw new Error(`Session ${session.id} carries no valid order`);
  if (session.currency !== order.currency || session.amount_total !== order.total) {
    throw new Error(`Session ${session.id} amount mismatch: ${session.amount_total} vs ${order.total}`);
  }
  return order;
}

module.exports = { createCheckout, constructEvent, retrieveSession, orderIfPaid, chunkToken, tokenFromMetadata };
