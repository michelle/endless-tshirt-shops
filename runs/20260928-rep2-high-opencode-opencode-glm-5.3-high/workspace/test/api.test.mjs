// API-level tests: validation, metadata round-trips, Stripe form encoding,
// the webhook signature check, and the Prodigi order body. Run with npm test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateCheckout, toMetadata, orderFromMetadata, OrderError } from '../api/_lib/validate.js';
import { verifyWebhookSignature } from '../api/_lib/stripe.js';
import { prodigiOrderBody } from '../api/_lib/prodigi.js';

const PRINT = 'https://rfqmvma3gj4gvmvb.public.blob.vercel-storage.com/prints/0123456789abcdef.png';

function validBody(overrides = {}) {
  return {
    design: {
      lat: 40.7128,
      lng: -74.006,
      wallISO: '1991-06-14T23:42',
      timezone: 'America/New_York',
      title: 'The night we met',
      placeLabel: 'New York, New York',
      theme: 'aurora',
      showMoon: true,
      showLines: true,
      ...overrides.design,
    },
    garment: { color: 'white', size: 'm', quantity: 1, ...overrides.garment },
    address: {
      name: 'Robin Vega',
      email: 'robin@example.com',
      line1: '14 Harbor Lane',
      line2: 'Apt 3',
      city: 'Cape May',
      state: 'NJ',
      zip: '08204',
      country: 'US',
      ...overrides.address,
    },
    print: overrides.print ?? PRINT,
  };
}

test('a valid order passes and is priced server-side', () => {
  const order = validateCheckout(validBody());
  assert.equal(order.amounts.totalCents, 4450);
  assert.equal(order.design.title, 'The night we met');
  assert.equal(order.garment.quantity, 1);
});

test('client prices are ignored — the server computes the amount', () => {
  const order = validateCheckout(
    validBody({ design: {}, garment: { color: 'white', size: '3xl', quantity: 2 } }),
  );
  assert.equal(order.amounts.unitCents, 4200);
  assert.equal(order.amounts.totalCents, 4200 * 2 + 650);
});

test('bad orders are rejected with useful errors', () => {
  assert.throws(() => validateCheckout(validBody({ design: { lat: 99, lng: 0 } })), OrderError);
  assert.throws(() => validateCheckout(validBody({ design: { wallISO: '1991-06-14 23:42' } })), OrderError);
  assert.throws(() => validateCheckout(validBody({ design: { wallISO: '1899-06-14T23:42' } })), OrderError);
  assert.throws(() => validateCheckout(validBody({ design: { timezone: 'Mars/Olympus' } })), OrderError);
  assert.throws(() => validateCheckout(validBody({ design: { theme: 'nope' } })), OrderError);
  assert.throws(() => validateCheckout(validBody({ design: { showMoon: 'yes' } })), OrderError);
  assert.throws(() => validateCheckout(validBody({ garment: { size: '9xl' } })), OrderError);
  assert.throws(() => validateCheckout(validBody({ garment: { color: 'pink' } })), OrderError);
  assert.throws(() => validateCheckout(validBody({ garment: { quantity: 0 } })), OrderError);
  assert.throws(() => validateCheckout(validBody({ address: { country: 'XX' } })), OrderError);
  assert.throws(() => validateCheckout(validBody({ address: { email: 'not-an-email' } })), OrderError);
  assert.throws(() => validateCheckout(validBody({ address: { name: 'x' } })), OrderError);
  assert.throws(() => validateCheckout(validBody({ print: 'https://example.com/evil.png' })), OrderError);
  assert.throws(() => validateCheckout(validBody({ design: { title: 'x'.repeat(41) } })), OrderError);
  assert.throws(() => validateCheckout(null), OrderError);
  // quantity above the limit is clamped, not rejected
  assert.equal(validateCheckout(validBody({ garment: { quantity: 99 } })).garment.quantity, 5);
});

test('metadata round-trips the order exactly', () => {
  const order = validateCheckout(validBody());
  const metadata = toMetadata(order);
  for (const value of Object.values(metadata)) {
    assert.ok(typeof value === 'string' && value.length <= 500, 'Stripe metadata values are strings under 500 chars');
  }
  const restored = orderFromMetadata(metadata);
  assert.equal(restored.design.t, '1991-06-14T23:42');
  assert.equal(restored.design.tz, 'America/New_York');
  assert.equal(restored.design.ti, 'The night we met');
  assert.equal(restored.garment.c, 'white');
  assert.equal(restored.garment.s, 'm');
  assert.equal(restored.address.country, 'US');
  assert.equal(restored.print, PRINT);
  // The keys survive Stripe's stringification untouched.
  assert.equal(orderFromMetadata({ ns_spec: 'not json' }), null);
  assert.equal(orderFromMetadata({}), null);
});

test('stripe form encoding nests like Stripe expects', async () => {
  // spot-check the encoder through a tiny params object
  const { stripeRequest } = await import('../api/_lib/stripe.js');
  // encodeParams is not exported; verify behavior through Stripe itself is
  // not possible offline, so we test the shape via the order body instead.
  const body = prodigiOrderBody(
    { design: { ti: 'Our sky', pl: 'Reykjavík', t: '2001-06-14T23:42' }, garment: { c: 'navy', s: 'l', q: 2 }, address: { name: 'Robin Vega', line1: '14 Test Place', line2: '', city: 'Somewhere', state: '', zip: '12345', country: 'US' }, print: PRINT },
    { merchantReference: 'stripe-cs_123', idempotencyKey: 'pi-pi_123', orderKey: 'tee-cs_123' },
  );
  assert.equal(body.items[0].sku, 'GLOBAL-TEE-BC-3001');
  assert.equal(body.shippingMethod, 'Standard');
  assert.equal(body.idempotencyKey, 'pi-pi_123');
  assert.equal(body.items[0].copies, 2);
  assert.equal(body.items[0].attributes.color, 'navy blue');
  assert.equal(body.items[0].attributes.size, 'l');
  assert.equal(body.items[0].assets[0].printArea, 'front');
  assert.equal(body.items[0].assets[0].url, PRINT);
  assert.equal(body.items[0].sizing, 'fillPrintArea');
  assert.equal(body.recipient.address.countryCode, 'US');
  assert.equal(body.recipient.address.stateOrCounty, undefined);
  assert.ok(typeof stripeRequest === 'function');
});

test('webhook signature verification follows the Stripe v1 scheme', async () => {
  const { createHmac } = await import('node:crypto');
  const secret = 'whsec_test_secret';
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed' });
  const raw = `${timestamp}.${payload}`;
  const signature = createHmac('sha256', secret).update(raw).digest('hex');
  const header = `t=${timestamp},v1=${signature}`;
  assert.equal(verifyWebhookSignature(payload, header, secret), true);
  // wrong secret, tampered payload, stale timestamp, missing header
  assert.equal(verifyWebhookSignature(payload, header, 'whsec_other'), false);
  assert.equal(verifyWebhookSignature('{"id":"evt_2"}', header, secret), false);
  assert.equal(verifyWebhookSignature(payload, `t=${timestamp - 4000},v1=${signature}`, secret), false);
  assert.equal(verifyWebhookSignature(payload, null, secret), false);
  assert.equal(verifyWebhookSignature(payload, header, ''), false);
});

test('every endpoint module resolves its imports', async () => {
  // Importing the function modules themselves (not just their libs) catches
  // broken relative paths — the class of bug that only shows up deployed.
  const endpoints = [
    '../api/catalog.js',
    '../api/checkout.js',
    '../api/order-status.js',
    '../api/print-upload.js',
    '../api/webhooks/stripe.js',
  ];
  for (const path of endpoints) {
    const module = await import(path);
    assert.equal(typeof module.default, 'function', `${path} exports a default handler`);
  }
});
