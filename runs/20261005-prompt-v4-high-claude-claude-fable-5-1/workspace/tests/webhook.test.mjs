// Exercises the webhook handler with a signed payload and a stubbed fulfilment path.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import Stripe from 'stripe';

process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_testsecret';
const handler = (await import('../api/stripe-webhook.js')).default;

function mockRes() {
  const res = { statusCode: 200, headers: {}, body: '' };
  res.setHeader = (k, v) => { res.headers[k] = v; };
  res.end = (b) => { res.body = b || ''; res.done = true; };
  return res;
}
function mockReq(body, headers) {
  const req = Readable.from([Buffer.from(body)]);
  req.method = 'POST';
  req.headers = headers;
  return req;
}

test('rejects a payload with a bad signature', async () => {
  const req = mockReq('{}', { 'stripe-signature': 't=1,v1=deadbeef' });
  const res = mockRes();
  await handler(req, res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body, /signature verification failed/);
});

test('accepts a correctly signed, unrelated event', async () => {
  const payload = JSON.stringify({ id: 'evt_1', object: 'event', type: 'payment_intent.created', data: { object: { id: 'pi_1' } } });
  const sig = Stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET });
  const res = mockRes();
  await handler(mockReq(payload, { 'stripe-signature': sig }), res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(JSON.parse(res.body), { received: true, ignored: 'payment_intent.created' });
});

test('skips completed sessions that are not yet paid', async () => {
  const payload = JSON.stringify({ id: 'evt_2', object: 'event', type: 'checkout.session.completed', data: { object: { id: 'cs_test_1', payment_status: 'unpaid' } } });
  const sig = Stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET });
  const res = mockRes();
  await handler(mockReq(payload, { 'stripe-signature': sig }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(JSON.parse(res.body).skipped, 'not paid yet');
});

test('GET is not allowed', async () => {
  const req = mockReq('', {}); req.method = 'GET';
  const res = mockRes();
  await handler(req, res);
  assert.equal(res.statusCode, 405);
});
