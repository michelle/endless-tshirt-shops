import test from 'node:test';
import assert from 'node:assert/strict';

process.env.PRODIGI_API_KEY = 'test_unit';
process.env.STRIPE_SECRET_KEY = 'sk_test_unit';
const { createStripeCheckout, fulfillStripeSession, setStripeClientForTests } = await import('../lib/payments.js');
const { validateDesign, decodeDesign, encodeDesign, DEFAULT_DESIGN, SHIPPING } = await import('../lib/design.js');
const { sign, verify } = await import('../lib/sign.js');

const design = validateDesign({ ...DEFAULT_DESIGN, title: 'Quote "test" <b>', size: '2xl' }).design;

function fakeStripe(session) {
  const created = [];
  return {
    created,
    checkout: { sessions: { create: async (p) => { created.push(p); return { url: 'https://checkout.stripe.test/x' }; }, retrieve: async () => session } },
  };
}

test('design validation sanitises text and rejects bad input', () => {
  assert.equal(design.title, 'Quote "test" b');
  assert.equal(validateDesign({ ...DEFAULT_DESIGN, date: '2019-02-31' }).ok, false);
  assert.equal(validateDesign({ ...DEFAULT_DESIGN, lat: 120 }).ok, false);
  assert.equal(validateDesign({ ...DEFAULT_DESIGN, tz: 'Mars/Olympus' }).ok, false);
  // a theme that is unreadable on the shirt colour is replaced
  assert.equal(validateDesign({ ...DEFAULT_DESIGN, shirt: 'white', theme: 'starlight' }).design.theme, 'midnight');
  assert.deepEqual(decodeDesign(encodeDesign(design)).design, design);
});

test('signed tokens detect tampering', () => {
  const t = sign({ a: 1 });
  assert.deepEqual(verify(t), { a: 1 });
  assert.equal(verify(t.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A'))), null);
  assert.equal(verify(sign({ a: 1, exp: Date.now() - 1 })), null);
});

test('checkout session: single destination, fixed shipping, design in metadata, price by size', async () => {
  const fake = fakeStripe();
  setStripeClientForTests(fake);
  await createStripeCheckout({ design, country: 'GB', origin: 'https://shop.test' });
  const p = fake.created[0];
  assert.equal(p.mode, 'payment');
  assert.deepEqual(p.shipping_address_collection.allowed_countries, ['GB']);
  assert.equal(p.shipping_options[0].shipping_rate_data.fixed_amount.amount, SHIPPING.GB);
  assert.equal(p.line_items[0].price_data.unit_amount, 4100); // 2xl surcharge
  assert.ok(p.success_url.startsWith('https://shop.test/success?session_id={CHECKOUT_SESSION_ID}'));
  assert.deepEqual(decodeDesign(p.metadata.design).design, design);
  assert.ok(p.metadata.design.length < 500);
});

function mockProdigi() {
  const calls = [];
  globalThis.fetch = async (url, opts) => {
    calls.push({ url, body: opts?.body ? JSON.parse(opts.body) : null, method: opts?.method });
    return new Response(JSON.stringify({ outcome: 'Created', order: { id: 'ord_1', status: { stage: 'InProgress' } } }), { status: 200 });
  };
  return calls;
}

const paidSession = (extra = {}) => ({
  id: 'cs_test_123', payment_status: 'paid', metadata: { design: encodeDesign(design), country: 'GB' },
  customer_details: { email: 'a@b.test', phone: '+441234' },
  collected_information: { shipping_details: { name: 'Ann Lee', address: { line1: '1 High St', line2: null, city: 'London', state: null, postal_code: 'N1 1AA', country: 'GB' } } },
  ...extra,
});

test('unpaid sessions are NEVER sent to Prodigi', async () => {
  const calls = mockProdigi();
  setStripeClientForTests(fakeStripe(paidSession({ payment_status: 'unpaid' })));
  const r = await fulfillStripeSession('cs_test_123', 'https://shop.test');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'unpaid');
  assert.equal(calls.length, 0);
});

test('paid sessions create one idempotent Prodigi order with signed print URL', async () => {
  const calls = mockProdigi();
  setStripeClientForTests(fakeStripe(paidSession()));
  const r = await fulfillStripeSession('cs_test_123', 'https://shop.test');
  assert.equal(r.ok, true);
  const order = calls[0].body;
  assert.equal(order.idempotencyKey, 'cs_test_123');
  assert.equal(order.merchantReference, 'cs_test_123');
  assert.equal(order.recipient.address.countryCode, 'GB');
  assert.equal(order.recipient.address.postalOrZipCode, 'N1 1AA');
  const item = order.items[0];
  assert.equal(item.sku, 'GLOBAL-TEE-GIL-64000');
  assert.deepEqual(item.attributes, { color: 'black', size: '2xl' });
  const url = item.assets[0].url;
  assert.match(url, /^https:\/\/shop\.test\/api\/print\/.+\.png$/);
  const payload = verify(url.split('/api/print/')[1].replace(/\.png$/, ''));
  assert.equal(payload.t, 'print');
  assert.deepEqual(decodeDesign(payload.design).design, design);
});

test('legacy shipping_details location is also supported', async () => {
  const calls = mockProdigi();
  const s = paidSession();
  s.shipping_details = s.collected_information.shipping_details;
  delete s.collected_information;
  setStripeClientForTests(fakeStripe(s));
  assert.equal((await fulfillStripeSession('cs_test_123', 'https://shop.test')).ok, true);
  assert.equal(calls.length, 1);
});
