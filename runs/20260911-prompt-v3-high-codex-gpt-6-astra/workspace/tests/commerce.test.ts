import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import Stripe from 'stripe';
import sharp from 'sharp';
import {
  initialDesign,
  orderSchema,
  artwork,
  designSchema,
} from '../lib/design';
import {
  sign,
  verify,
  paidOrder,
  fulfill,
  shipping,
  APP,
  fulfillmentMode,
} from '../lib/server';
import { printPng, outlinedSvg } from '../lib/render';
import { POST as webhook } from '../app/api/webhooks/stripe/route';
import { POST as checkout } from '../app/api/checkout/route';
process.env.ORDER_SIGNING_SECRET =
  'test-only-signing-key-not-for-production-123456789';
process.env.APP_URL = 'https://test.example';
process.env.PRODIGI_ENV = 'sandbox';
process.env.PRODIGI_API_KEY = 'test-only';
process.env.STRIPE_SECRET_KEY = 'sk_test_not_real';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_only';
const order = {
  design: initialDesign,
  size: 'm',
  quantity: 1,
  approved: true,
  requestId: randomUUID(),
};
function session(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cs_test_paidfixture',
    status: 'complete',
    payment_status: 'paid',
    livemode: false,
    currency: 'usd',
    amount_subtotal: 4200,
    amount_total: 4800,
    total_details: { amount_shipping: 600, amount_discount: 0, amount_tax: 0 },
    metadata: { app: APP, order: JSON.stringify(order) },
    payment_intent: {
      id: 'pi_test',
      status: 'succeeded',
      latest_charge: 'ch_test',
    },
    customer_details: { email: 'test@example.com' },
    collected_information: {
      shipping_details: {
        name: 'Test Customer',
        address: {
          line1: '123 Main Street',
          line2: '',
          city: 'San Francisco',
          state: 'CA',
          postal_code: '94103',
          country: 'US',
        },
      },
    },
    ...overrides,
  } as unknown as Stripe.Checkout.Session;
}
function fakeClient(s: Stripe.Checkout.Session, refunded = false) {
  return {
    checkout: {
      sessions: {
        retrieve: async () => s,
        update: async (
          _: string,
          data: { metadata: Record<string, string> },
        ) => {
          s.metadata = { ...s.metadata, ...data.metadata };
          return s;
        },
      },
    },
    charges: {
      retrieve: async () => ({
        refunded,
        amount_refunded: refunded ? 4800 : 0,
        disputed: false,
      }),
    },
  } as unknown as Stripe;
}
test('rejects unapproved, oversized, unknown and malformed orders', () => {
  for (const extra of [
    { approved: false },
    { quantity: 0 },
    { quantity: 6 },
    { size: '4xl' },
    { amount: 1 },
    { design: { ...initialDesign, headline: 'x'.repeat(25) } },
    { design: { ...initialDesign, date: '2026-02-30' } },
  ])
    assert.equal(orderSchema.safeParse({ ...order, ...extra }).success, false);
  assert.equal(orderSchema.safeParse(order).success, true);
});
test('signed print payload roundtrip and tamper rejection', () => {
  const token = sign({ v: 1, design: initialDesign });
  assert.deepEqual(verify(token), { v: 1, design: initialDesign });
  assert.throws(() => verify(token.slice(0, -4) + 'AAAA'));
  assert.throws(() => verify('garbage'));
});
test('art is deterministic, personalized, and XML-safe', () => {
  assert.equal(artwork(initialDesign), artwork(initialDesign));
  assert.notEqual(
    artwork(initialDesign),
    artwork({ ...initialDesign, city: 'AUSTIN' }),
  );
  assert.match(
    artwork({ ...initialDesign, headline: '<script> & me' }),
    /&lt;SCRIPT&gt; &amp; ME/,
  );
  assert.equal(
    designSchema.safeParse({ ...initialDesign, headline: '😀' }).success,
    false,
  );
});
test('print file has outlined fonts, transparent RGBA and 300dpi sufficient resolution', async () => {
  assert.doesNotMatch(outlinedSvg(initialDesign), /<text/);
  const b = await printPng(initialDesign);
  const m = await sharp(b).metadata();
  assert.equal(m.width, 4680);
  assert.equal(m.height, 5882);
  assert.equal(m.hasAlpha, true);
  assert.equal(m.density, 300);
});
test('verifies paid status, exact total, currency and environment', () => {
  assert.equal(paidOrder(session()).size, 'm');
  for (const change of [
    { payment_status: 'unpaid' },
    { status: 'open' },
    { amount_total: 4200 },
    { currency: 'eur' },
    { livemode: true },
    { amount_subtotal: 1 },
    {
      total_details: { amount_shipping: 0, amount_tax: 0, amount_discount: 0 },
    },
  ])
    assert.throws(() => paidOrder(session(change)));
});
test('blocks live printing with test payment keys', () => {
  process.env.PRODIGI_ENV = 'live';
  assert.throws(fulfillmentMode);
  process.env.PRODIGI_ENV = 'sandbox';
});
test('US shipping is required and mapped correctly', () => {
  assert.equal(shipping(session()).address.postalOrZipCode, '94103');
  assert.equal('line2' in shipping(session()).address, false);
  assert.throws(() => shipping(session({ collected_information: {} })));
});
test('unpaid and refunded sessions never reach Prodigi', async () => {
  const old = global.fetch;
  let calls = 0;
  global.fetch = async () => {
    calls++;
    throw new Error('must not run');
  };
  try {
    await assert.rejects(() =>
      fulfill('cs_test', fakeClient(session({ payment_status: 'unpaid' }))),
    );
    await assert.rejects(() => fulfill('cs_test', fakeClient(session(), true)));
    assert.equal(calls, 0);
  } finally {
    global.fetch = old;
  }
});
test('paid fulfillment creates correct shirt once; replay returns existing reference', async () => {
  const old = global.fetch;
  let calls = 0;
  const s = session(),
    client = fakeClient(s);
  global.fetch = async (url, init) => {
    calls++;
    assert.match(String(url), /api.sandbox.prodigi.com/);
    const p = JSON.parse(String(init?.body));
    assert.equal(p.idempotencyKey, s.id);
    assert.equal(p.items[0].sku, 'GLOBAL-TEE-BC-3001');
    assert.deepEqual(p.items[0].attributes, { color: 'black', size: 'm' });
    assert.equal(p.items[0].copies, 1);
    assert.equal(p.items[0].assets[0].printArea, 'front');
    assert.ok(
      verify(new URL(p.items[0].assets[0].url).searchParams.get('token')!),
    );
    return Response.json({ outcome: 'Created', order: { id: 'ord_mock' } });
  };
  try {
    assert.deepEqual(await fulfill(s.id, client), {
      id: 'ord_mock',
      existing: false,
    });
    assert.deepEqual(await fulfill(s.id, client), {
      id: 'ord_mock',
      existing: true,
    });
    assert.equal(calls, 1);
  } finally {
    global.fetch = old;
  }
});
test('retry after provider timeout keeps the same permanent idempotency key', async () => {
  const old = global.fetch;
  const keys: string[] = [];
  const s = session(),
    client = fakeClient(s);
  global.fetch = async (_, init) => {
    keys.push(JSON.parse(String(init?.body)).idempotencyKey);
    if (keys.length === 1) throw new Error('timeout after creation');
    return Response.json({
      outcome: 'AlreadyExists',
      order: { id: 'ord_recovered' },
    });
  };
  try {
    await assert.rejects(() => fulfill(s.id, client));
    assert.equal(s.metadata?.fulfillment, 'retry_required');
    await fulfill(s.id, client);
    assert.deepEqual(keys, [s.id, s.id]);
    assert.equal(s.metadata?.prodigiOrderId, 'ord_recovered');
  } finally {
    global.fetch = old;
  }
});
test('webhook rejects forged signature and acknowledges unpaid event without dispatch', async () => {
  assert.equal(
    (
      await webhook(
        new Request('https://test.example/api/webhooks/stripe', {
          method: 'POST',
          body: '{}',
          headers: { 'stripe-signature': 'forged' },
        }),
      )
    ).status,
    400,
  );
  const payload = JSON.stringify({
    id: 'evt_test',
    object: 'event',
    type: 'checkout.session.completed',
    data: { object: session({ payment_status: 'unpaid' }) },
  });
  const sig = Stripe.webhooks.generateTestHeaderString({
    payload,
    secret: process.env.STRIPE_WEBHOOK_SECRET!,
  });
  const r = await webhook(
    new Request('https://test.example/api/webhooks/stripe', {
      method: 'POST',
      body: payload,
      headers: { 'stripe-signature': sig },
    }),
  );
  assert.equal(r.status, 200);
  assert.equal((await r.json()).fulfilled, false);
});
test('checkout rejects client pricing and foreign origins', async () => {
  const req = (body: unknown, origin: string) =>
    new Request('https://test.example/api/checkout', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { origin, 'Content-Type': 'application/json' },
    });
  assert.equal(
    (await checkout(req({ ...order, price: 1 }, 'https://test.example')))
      .status,
    400,
  );
  assert.equal(
    (await checkout(req(order, 'https://evil.example'))).status,
    403,
  );
});
