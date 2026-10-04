import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import zlib from 'node:zlib';
import Stripe from 'stripe';
import { openDb } from '../src/db.js';
import { loadConfig } from '../src/config.js';
import { createOrderService } from '../src/orders.js';
import { createApp } from '../src/app.js';
import { createStripeProvider, createDemoProvider } from '../src/payments.js';
import { ProdigiError } from '../src/prodigi.js';

const WHSEC = 'whsec_test_secret';
const quiet = { info() {}, warn() {}, error() {} };
const listen = (server) => new Promise((r) => server.listen(0, '127.0.0.1', () => r(server.address().port)));

// A tiny fake of the Stripe API that records Checkout Session creations.
async function fakeStripeApi() {
  const created = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const params = new URLSearchParams(body);
      created.push({ url: req.url, params, auth: req.headers.authorization });
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ id: `cs_test_${created.length}`, object: 'checkout.session', url: `https://checkout.stripe.com/c/pay/cs_test_${created.length}` }));
    });
  });
  const port = await listen(server);
  return { created, port, close: () => server.close() };
}

async function harness({ provider = 'stripe', prodigiOverrides = {} } = {}) {
  const calls = { createOrder: [], quote: [] };
  const prodigi = {
    shippableCountries: async () => ['US', 'GB', 'DE'],
    quote: async (items, country) => { calls.quote.push([items, country]); return { shippingCostCents: 462, itemsCostCents: 1189, taxCents: 0 }; },
    createOrder: async (order, assetUrlFor) => { calls.createOrder.push({ order, urls: order.items.map((_, i) => assetUrlFor(i)) }); return { outcome: 'Created', order: { id: `ord_${calls.createOrder.length}` } }; },
    findByMerchantReference: async () => null,
    getOrder: async () => ({ order: { status: { stage: 'InProgress' }, shipments: [] } }),
    ...prodigiOverrides,
  };
  const stripeApi = await fakeStripeApi();
  const config = { ...loadConfig({ PRODIGI_API_KEY: 'k', DEMO_PAYMENTS: provider === 'demo' ? '1' : '', STRIPE_SECRET_KEY: provider === 'stripe' ? 'sk_test_x' : '', STRIPE_WEBHOOK_SECRET: WHSEC, ADMIN_TOKEN: 'adm' }), dataDir: ':memory:', baseUrl: 'https://shop.example.com' };
  const payments = provider === 'stripe'
    ? createStripeProvider({ secretKey: 'sk_test_x', webhookSecret: WHSEC, baseUrl: config.baseUrl, stripeOptions: { host: '127.0.0.1', port: stripeApi.port, protocol: 'http', maxNetworkRetries: 0 } })
    : createDemoProvider({ baseUrl: config.baseUrl });
  const db = openDb(':memory:');
  const orders = createOrderService({ db, config, prodigi, payments, log: quiet });
  const app = createApp({ config, orders, prodigi, payments, log: quiet });
  const server = http.createServer(app);
  const port = await listen(server);
  const base = `http://127.0.0.1:${port}`;
  const post = (p, body, headers = {}) => fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
  return { base, post, calls, orders, db, stripeApi, config, close: () => { server.close(); stripeApi.close(); } };
}

const item = { date: '1990-07-15', name: 'Amelia Rose', line: 'Born 7:42 AM', color: 'black', accent: 'solar', size: 'm', qty: 2 };
const address = { name: 'Amelia Rose', line1: '1 Main St', city: 'Austin', state: 'TX', postalCode: '78701', country: 'US' };
const checkoutBody = (over = {}) => ({ items: [item], email: 'amelia@example.com', address, ...over });

function webhook(h, event, { secret = WHSEC } = {}) {
  const payload = JSON.stringify(event);
  const sig = Stripe.webhooks.generateTestHeaderString({ payload, secret });
  return h.post('/api/stripe/webhook', payload, { 'stripe-signature': sig });
}
const sessionEvent = (order, over = {}, type = 'checkout.session.completed') => ({
  id: `evt_${Math.random().toString(36).slice(2)}`, object: 'event', type,
  data: { object: { id: order.paymentRef, object: 'checkout.session', client_reference_id: order.id, metadata: { orderId: order.id }, payment_status: 'paid', status: 'complete', amount_total: order.totalCents, currency: 'usd', ...over } },
});

async function startCheckout(h, body = checkoutBody()) {
  const res = await h.post('/api/checkout', body);
  const json = await res.json();
  assert.equal(res.status, 200, JSON.stringify(json));
  return { json, order: h.orders.get(json.orderId) };
}
const settle = () => new Promise((r) => setTimeout(r, 400));

test('checkout creates a pending order and a Stripe session, but sends nothing to Prodigi', async () => {
  const h = await harness();
  const { json, order } = await startCheckout(h);
  assert.match(json.url, /^https:\/\/checkout\.stripe\.com\//);
  assert.equal(order.status, 'pending_payment');
  assert.equal(order.subtotalCents, 7600);
  assert.equal(order.shippingCents, 500); // 4.62 rounded up to 50c
  assert.equal(order.totalCents, 8100);
  assert.equal(h.calls.createOrder.length, 0);

  const s = h.stripeApi.created[0].params;
  assert.equal(s.get('mode'), 'payment');
  assert.equal(s.get('metadata[orderId]'), order.id);
  assert.equal(s.get('line_items[0][price_data][unit_amount]'), '3800');
  assert.equal(s.get('line_items[0][quantity]'), '2');
  assert.equal(s.get('line_items[1][price_data][unit_amount]'), '500');
  assert.equal(s.get('customer_email'), 'amelia@example.com');
  assert.ok(s.get('success_url').startsWith(`https://shop.example.com/order/${order.id}?t=`));

  // print file is not downloadable before payment
  const r = await fetch(`${h.base}/print/${order.id}/1.png?t=${order.token}`);
  assert.equal(r.status, 404);
  h.close();
});

test('rejects invalid designs, addresses and stale totals before taking payment', async () => {
  const h = await harness();
  const bad = async (body, status = 400) => assert.equal((await h.post('/api/checkout', body)).status, status);
  await bad(checkoutBody({ items: [{ ...item, date: '2051-01-01' }] }));
  await bad(checkoutBody({ items: [{ ...item, name: '' }] }));
  await bad(checkoutBody({ items: [{ ...item, name: '<script>' }] }));
  await bad(checkoutBody({ items: [{ ...item, qty: 99 }] }));
  await bad(checkoutBody({ items: [{ ...item, color: 'hotpink' }] }));
  await bad(checkoutBody({ items: [] }));
  await bad(checkoutBody({ email: 'nope' }));
  await bad(checkoutBody({ address: { ...address, country: 'KP' } }));
  await bad(checkoutBody({ address: { ...address, postalCode: 'ABC' } }));
  await bad(checkoutBody({ expectedTotalCents: 1 }), 409);
  assert.equal(h.orders.list().length, 0);
  h.close();
});

test('webhook with a bad signature is rejected', async () => {
  const h = await harness();
  const { order } = await startCheckout(h);
  const res = await webhook(h, sessionEvent(order), { secret: 'whsec_wrong' });
  assert.equal(res.status, 400);
  await settle();
  assert.equal(h.orders.get(order.id).status, 'pending_payment');
  assert.equal(h.calls.createOrder.length, 0);
  h.close();
});

test('unpaid or under-paid sessions never reach Prodigi', async () => {
  const h = await harness();
  const { order } = await startCheckout(h);
  assert.equal((await webhook(h, sessionEvent(order, { payment_status: 'unpaid' }))).status, 200);
  assert.equal((await webhook(h, sessionEvent(order, { amount_total: 100 }))).status, 500);
  assert.equal((await webhook(h, sessionEvent(order, { currency: 'eur' }))).status, 500);
  assert.equal((await webhook(h, sessionEvent(order, { id: 'cs_test_other' }))).status, 500);
  await settle();
  assert.equal(h.orders.get(order.id).status, 'pending_payment');
  assert.equal(h.calls.createOrder.length, 0);
  h.close();
});

test('a paid session creates exactly one Prodigi order with a valid print file', async () => {
  const h = await harness();
  const { order } = await startCheckout(h);
  const ev = sessionEvent(order);
  assert.equal((await webhook(h, ev)).status, 200);
  assert.equal((await webhook(h, ev)).status, 200); // Stripe redelivery
  assert.equal((await webhook(h, sessionEvent(order))).status, 200); // a second event for the same session
  await settle();

  const done = h.orders.get(order.id);
  assert.equal(done.status, 'submitted');
  assert.equal(done.prodigiOrderId, 'ord_1');
  assert.equal(h.calls.createOrder.length, 1);

  const sent = h.calls.createOrder[0];
  assert.equal(sent.order.id, order.id);
  assert.equal(sent.order.items[0].qty, 2);
  assert.equal(sent.urls[0], `https://shop.example.com/print/${order.id}/1.png?t=${order.token}`);

  const r = await fetch(`${h.base}/print/${order.id}/1.png?t=${order.token}`);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-type'), 'image/png');
  const png = Buffer.from(await r.arrayBuffer());
  assert.equal(png.readUInt32BE(16), 4665);
  assert.equal(png.readUInt32BE(20), 5844);
  assert.equal(png[25], 6, 'RGBA so the background is transparent');
  assert.ok(png.includes(Buffer.from('pHYs')), '300dpi metadata present');
  // wrong token is rejected
  assert.equal((await fetch(`${h.base}/print/${order.id}/1.png?t=bad`)).status, 404);
  h.close();
});

test('transient Prodigi failure is retried; permanent failure is flagged', async () => {
  let n = 0;
  const h = await harness({
    prodigiOverrides: {
      createOrder: async () => {
        n++;
        if (n === 1) throw new ProdigiError('boom', { status: 503, retryable: true });
        return { outcome: 'Created', order: { id: 'ord_retry' } };
      },
    },
  });
  const { order } = await startCheckout(h);
  await webhook(h, sessionEvent(order));
  await settle();
  let o = h.orders.get(order.id);
  assert.equal(o.status, 'paid');
  assert.match(o.lastError, /boom/);
  h.db.prepare('UPDATE orders SET next_attempt_at = 0 WHERE id = ?').run(order.id);
  await h.orders.reconcile();
  o = h.orders.get(order.id);
  assert.equal(o.status, 'submitted');
  assert.equal(o.prodigiOrderId, 'ord_retry');
  h.close();

  const h2 = await harness({ prodigiOverrides: { createOrder: async () => { throw new ProdigiError('bad address', { status: 400, retryable: false }); } } });
  const { order: o2 } = await startCheckout(h2);
  await webhook(h2, sessionEvent(o2));
  await settle();
  assert.equal(h2.orders.get(o2.id).status, 'fulfillment_failed');
  const admin = await fetch(`${h2.base}/admin`, { headers: { Authorization: 'Basic ' + Buffer.from('x:adm').toString('base64') } });
  assert.equal(admin.status, 200);
  assert.match(await admin.text(), /fulfillment_failed/);
  assert.equal((await fetch(`${h2.base}/admin`)).status, 401);
  h2.close();
});

test('retry after an ambiguous failure reuses an existing Prodigi order instead of duplicating', async () => {
  let created = 0;
  const h = await harness({
    prodigiOverrides: {
      createOrder: async () => { created++; throw new ProdigiError('timeout', { retryable: true }); },
      findByMerchantReference: async (ref) => ({ id: 'ord_existing', merchantReference: ref }),
    },
  });
  const { order } = await startCheckout(h);
  await webhook(h, sessionEvent(order));
  await settle();
  h.db.prepare('UPDATE orders SET next_attempt_at = 0 WHERE id = ?').run(order.id);
  await h.orders.reconcile();
  const o = h.orders.get(order.id);
  assert.equal(o.status, 'submitted');
  assert.equal(o.prodigiOrderId, 'ord_existing');
  assert.equal(created, 1);
  h.close();
});

test('async payment failure and expiry never fulfil', async () => {
  const h = await harness();
  const { order } = await startCheckout(h);
  await webhook(h, sessionEvent(order, { payment_status: 'unpaid' }, 'checkout.session.async_payment_failed'));
  assert.equal(h.orders.get(order.id).status, 'payment_failed');
  assert.equal(h.calls.createOrder.length, 0);
  h.close();
});

test('demo provider: declined card does not print, approved card does; demo is blocked against live Prodigi', async () => {
  const h = await harness({ provider: 'demo' });
  const { json, order } = await startCheckout(h);
  assert.match(json.url, /\/demo-pay\//);
  const decline = await h.post(`/api/demo/pay/${order.id}?t=${order.token}`, { outcome: 'decline' });
  assert.equal((await decline.json()).ok, false);
  assert.equal(h.calls.createOrder.length, 0);
  const { order: o2 } = await startCheckout(h);
  const ok = await h.post(`/api/demo/pay/${o2.id}?t=${o2.token}`, { outcome: 'success' });
  assert.equal((await ok.json()).ok, true);
  await settle();
  assert.equal(h.orders.get(o2.id).status, 'submitted');
  assert.equal(h.calls.createOrder.length, 1);
  h.close();

  assert.throws(() => loadConfig({ PRODIGI_API_KEY: 'k', DEMO_PAYMENTS: '1', PRODIGI_BASE_URL: 'https://api.prodigi.com/v4.0' }), /sandbox/);
  assert.throws(() => loadConfig({ PRODIGI_API_KEY: 'k', DEMO_PAYMENTS: '1', STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_WEBHOOK_SECRET: 'w' }), /cannot be combined/);
  assert.throws(() => loadConfig({ PRODIGI_API_KEY: 'k' }), /STRIPE_SECRET_KEY/);
});

test('order page requires the secret token and hides the street address', async () => {
  const h = await harness();
  const { order } = await startCheckout(h);
  assert.equal((await fetch(`${h.base}/api/orders/${order.id}`)).status, 404);
  const r = await fetch(`${h.base}/api/orders/${order.id}?t=${order.token}`);
  const j = await r.json();
  assert.equal(j.status, 'pending_payment');
  assert.ok(!JSON.stringify(j).includes('1 Main St'));
  h.close();
});
