'use strict';
process.env.SIGNING_SECRET = 'test-secret';
process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_dummy';
process.env.PRODIGI_API_KEY = 'dummy';
process.env.PUBLIC_URL = 'https://store.test';
const test = require('node:test');
const assert = require('node:assert/strict');
const Stripe = require('stripe');

// Stub everything that would leave the process before the server loads.
const submitted = [];
require('../src/design/print').renderPrintPng = async () => {};
require('../src/prodigi').submitOrder = async (order) => { submitted.push(order.id); return { id: 'ord_fake' }; };

const orders = require('../src/orders');
const stripePay = require('../src/payments/stripe');
const app = require('../server');

const payload = { items: [{ design: { name: 'Ada' }, color: 'black', size: 'm', qty: 1 }], recipient: { name: 'Ada Lovelace', email: 'ada@example.com', phone: '+1 415 555 0100', line1: '1 Market St', city: 'San Francisco', state: 'CA', postal: '94105', country: 'US' } };
const order = orders.buildOrder(payload, 'https://store.test');
const token = orders.signOrder(order);

function session(over = {}) {
  return { id: 'cs_test_1', payment_status: 'paid', currency: order.currency, amount_total: order.total, metadata: stripePay.chunkToken(token), ...over };
}
function event(type, obj) { return JSON.stringify({ id: 'evt_1', object: 'event', type, data: { object: obj } }); }
function signed(body, secret = 'whsec_test_dummy') {
  return new Stripe('sk_test_dummy').webhooks.generateTestHeaderString({ payload: body, secret });
}

test('orderIfPaid only releases fully paid, correctly priced sessions', () => {
  assert.equal(stripePay.orderIfPaid(session()).id, order.id);
  assert.equal(stripePay.orderIfPaid(session({ payment_status: 'unpaid' })), null);
  assert.throws(() => stripePay.orderIfPaid(session({ amount_total: 100 })), /mismatch/);
  assert.throws(() => stripePay.orderIfPaid(session({ currency: 'eur' })), /mismatch/);
  assert.throws(() => stripePay.orderIfPaid(session({ metadata: {} })), /no valid order/);
});

test('webhook gate: nothing is sent to Prodigi unless payment is confirmed', async () => {
  const server = app.listen(0);
  const url = `http://127.0.0.1:${server.address().port}/api/webhooks/stripe`;
  const post = (body, sig) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': sig }, body });
  try {
    let body = event('checkout.session.completed', session());
    assert.equal((await post(body, 'bogus')).status, 400);
    assert.equal((await post(body, signed(body, 'whsec_wrong'))).status, 400);
    body = event('checkout.session.completed', session({ payment_status: 'unpaid' }));
    assert.equal((await post(body, signed(body))).status, 200);
    body = event('checkout.session.expired', session());
    assert.equal((await post(body, signed(body))).status, 200);
    assert.deepEqual(submitted, []);

    body = event('checkout.session.completed', session());
    assert.equal((await post(body, signed(body))).status, 200);
    assert.deepEqual(submitted, [order.id]);
  } finally { server.close(); }
});

test('demo payment endpoints are disabled when Stripe is the provider', async () => {
  const server = app.listen(0);
  try {
    const r = await fetch(`http://127.0.0.1:${server.address().port}/api/demo/pay`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ o: token, card: { number: '4242424242424242', exp: '12/40', cvc: '123' } }) });
    assert.equal(r.status, 404);
    assert.deepEqual(submitted, [order.id]);
  } finally { server.close(); }
});
