import assert from 'node:assert/strict';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import Stripe from 'stripe';
import sharp from 'sharp';
import { artworkUrl } from '../lib/artwork';
import { prodigi, type ProdigiOrder } from '../lib/prodigi';
import { orderPayload } from '../lib/fulfillment';
process.loadEnvFile('.env.local');
assert.equal(
  process.env.PRODIGI_ENVIRONMENT,
  'sandbox',
  'Smoke tests may only run in sandbox',
);
const origin = process.env.APP_URL!;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const summary: Record<string, unknown> = {
  origin,
  checkedAt: new Date().toISOString(),
};
async function post(
  path: string,
  body: unknown,
  extra: Record<string, string> = {},
) {
  return fetch(origin + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', origin, ...extra },
    body: JSON.stringify(body),
  });
}
const home = await fetch(origin);
assert.equal(home.status, 200);
summary.homepage = '200';
const invalid = await post('/api/checkout', {
  fit: 'unisex',
  size: 'XXXL',
  timestamp: Date.now(),
  requestId: randomUUID(),
});
assert.equal(invalid.status, 400);
const foreign = await post(
  '/api/checkout',
  {},
  { origin: 'https://another.example' },
);
assert.equal(foreign.status, 403);
const noSignature = await post('/api/stripe/webhook', {});
assert.equal(noSignature.status, 400);
summary.inputAndWebhookGuards = 'passed';
const selection = {
  fit: 'unisex' as const,
  size: 'M' as const,
  timestamp: Date.now(),
};
const requestId = randomUUID();
const checkout = await post('/api/checkout', { ...selection, requestId });
const result = await checkout.json();
assert.equal(checkout.status, 200, JSON.stringify(result));
assert(result.url.startsWith('https://checkout.stripe.com/'));
const sessions = await stripe.checkout.sessions.list({ limit: 10 });
const session = sessions.data.find(
  (s) => s.metadata?.timestamp === String(selection.timestamp),
);
assert(session);
assert.equal(session.amount_total, 2250);
assert.equal(session.metadata?.size, 'M');
assert.equal(session.metadata?.fit, 'unisex');
assert.equal(session.livemode, false);
const repeat = await post('/api/checkout', { ...selection, requestId });
assert.equal((await repeat.json()).url, result.url);
summary.checkout = {
  id: session.id,
  amount: session.amount_total,
  idempotency: 'passed',
};
const unpaid = await post('/api/order', { sessionId: session.id });
const unpaidData = await unpaid.json();
assert.equal(unpaidData.paid, false);
summary.unpaidOrderGuard = 'passed';
const payload = JSON.stringify({
  id: 'evt_smoke_' + randomUUID(),
  object: 'event',
  type: 'checkout.session.completed',
  data: { object: { id: session.id, payment_status: 'unpaid' } },
  livemode: false,
});
const signature = stripe.webhooks.generateTestHeaderString({
  payload,
  secret: process.env.STRIPE_WEBHOOK_SECRET!,
});
const webhook = await fetch(origin + '/api/stripe/webhook', {
  method: 'POST',
  headers: {
    'stripe-signature': signature,
    'Content-Type': 'application/json',
  },
  body: payload,
});
assert.equal(webhook.status, 200);
summary.signedUnpaidWebhook = 'accepted without fulfillment';
const art = await fetch(artworkUrl(selection));
assert.equal(art.status, 200);
const bytes = Buffer.from(await art.arrayBuffer());
const meta = await sharp(bytes).metadata();
assert.equal(meta.width, 4677);
assert.equal(meta.height, 5881);
summary.artwork = {
  width: meta.width,
  height: meta.height,
  format: meta.format,
  density: meta.density,
};
const tampered = await fetch(
  artworkUrl(selection).replace(
    'timestamp=' + selection.timestamp,
    'timestamp=' + (selection.timestamp + 1),
  ),
);
assert.equal(tampered.status, 404);
if (process.argv.includes('--place-sandbox-order')) {
  const intent = await stripe.paymentIntents.create({
    amount: 2250,
    currency: 'usd',
    payment_method: 'pm_card_visa',
    confirm: true,
    payment_method_types: ['card'],
    metadata: { purpose: 'datetime-store-api-smoke-test' },
  });
  assert.equal(intent.status, 'succeeded');
  summary.testPaymentIntent = intent.id;
  const orderIds = [];
  for (const fit of ['unisex', 'fitted'] as const) {
    const testSession = {
      ...session,
      id: `smoke_${intent.id}_${fit}`,
      customer_details: { email: 'datetime-test@example.com' },
      collected_information: {
        shipping_details: {
          name: 'Datetime Sandbox Test',
          address: {
            line1: '123 Test Street',
            line2: null,
            city: 'San Francisco',
            state: 'CA',
            postal_code: '94107',
            country: 'US',
          },
        },
      },
    } as unknown as Stripe.Checkout.Session;
    const body = orderPayload(testSession, { ...selection, fit });
    const first = await prodigi<{ order: ProdigiOrder; outcome: string }>(
      '/orders',
      body,
    );
    assert(first.order?.id);
    const duplicate = await prodigi<{ order: ProdigiOrder; outcome: string }>(
      '/orders',
      body,
    );
    assert.equal(duplicate.order.id, first.order.id);
    orderIds.push({
      fit,
      id: first.order.id,
      outcome: first.outcome,
      duplicate: duplicate.outcome,
    });
  }
  summary.sandboxOrders = orderIds;
}
fs.mkdirSync('reports', { recursive: true });
fs.writeFileSync(
  'reports/smoke-test.json',
  JSON.stringify(summary, null, 2) + '\n',
);
console.log(JSON.stringify(summary, null, 2));
