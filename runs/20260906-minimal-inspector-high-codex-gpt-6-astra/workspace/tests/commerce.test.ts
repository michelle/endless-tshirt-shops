import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import type Stripe from 'stripe';
import {
  checkoutSchema,
  validateMoment,
  productItem,
  PRICE,
} from '../lib/catalog';
import {
  artworkSignature,
  validSignature,
  renderArtwork,
} from '../lib/artwork';
import { paidSelection, orderPayload } from '../lib/fulfillment';
process.env.ARTWORK_SIGNING_SECRET = 'test-signing-secret';
process.env.APP_URL = 'https://datetime.example';
process.env.PRODIGI_ENVIRONMENT = 'sandbox';
const selection = {
  fit: 'unisex' as const,
  size: 'M' as const,
  timestamp: 1788700000000,
};
const session = {
  id: 'cs_test_fixture_order',
  status: 'complete',
  payment_status: 'paid',
  mode: 'payment',
  currency: 'usd',
  amount_total: PRICE,
  livemode: false,
  metadata: {
    product: 'datetime-v1',
    fit: selection.fit,
    size: selection.size,
    timestamp: String(selection.timestamp),
  },
  collected_information: {
    shipping_details: {
      name: 'Test Customer',
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
  customer_details: { email: 'buyer@example.com' },
} as unknown as Stripe.Checkout.Session;
void test('rejects invalid size, custom prices, stale or future timestamps', () => {
  const input = {
    ...selection,
    requestId: 'fd650a32-7ed8-4411-843e-2511d5026a72',
  };
  assert(checkoutSchema.safeParse(input).success);
  assert(!checkoutSchema.safeParse({ ...input, size: 'XXXL' }).success);
  assert(!checkoutSchema.safeParse({ ...input, price: 1 }).success);
  assert.throws(() =>
    validateMoment(selection.timestamp, selection.timestamp + 120001),
  );
  assert.throws(() =>
    validateMoment(selection.timestamp, selection.timestamp - 120001),
  );
  validateMoment(selection.timestamp, selection.timestamp + 1000);
});
void test('maps both shirt cuts to verified Prodigi SKUs and attributes', () => {
  assert.equal(productItem(selection).sku, 'GLOBAL-TEE-BC-3001');
  assert.equal(
    productItem({ ...selection, fit: 'fitted', size: 'XL' }).sku,
    'GLOBAL-TEE-BC-6004',
  );
  assert.deepEqual(productItem({ ...selection, size: 'XL' }).attributes, {
    color: 'black',
    size: 'xl',
  });
});
void test('only a completed, paid, matching payment can be fulfilled', () => {
  assert.deepEqual(paidSelection(session), selection);
  for (const patch of [
    { payment_status: 'unpaid' },
    { status: 'open' },
    { amount_total: 1 },
    { currency: 'eur' },
    { livemode: true },
    { metadata: { product: 'different' } },
  ])
    assert.throws(() =>
      paidSelection({ ...session, ...patch } as Stripe.Checkout.Session),
    );
});
void test('order payload uses stable deduplication key and exact captured artwork', () => {
  const a = orderPayload(session, selection);
  assert.equal(a.idempotencyKey, session.id);
  assert.equal(a.merchantReference, session.id);
  assert.equal(a.items[0].assets[0].printArea, 'front');
  assert(a.items[0].assets[0].url.includes('timestamp=' + selection.timestamp));
  assert.equal(a.recipient.address.postalOrZipCode, '94107');
  assert.deepEqual(a, orderPayload(session, selection));
  assert.throws(() =>
    orderPayload({ ...session, collected_information: null }, selection),
  );
});
void test('artwork signatures reject tampering', () => {
  const sig = artworkSignature(selection.timestamp, 'unisex');
  assert(validSignature(selection.timestamp, 'unisex', sig));
  assert(!validSignature(selection.timestamp + 1, 'unisex', sig));
  assert(!validSignature(selection.timestamp, 'fitted', sig));
  assert(!validSignature(selection.timestamp, 'unisex', ''));
});
void test('both print files use full Prodigi dimensions, transparency, 300dpi and visible ink', async () => {
  for (const fit of ['unisex', 'fitted'] as const) {
    const png = await renderArtwork(selection.timestamp, fit);
    const meta = await sharp(png).metadata();
    assert.equal(meta.width, fit === 'unisex' ? 4677 : 4665);
    assert.equal(meta.height, fit === 'unisex' ? 5881 : 5844);
    assert.equal(meta.density, 300);
    assert(meta.hasAlpha);
    const stats = await sharp(png).stats();
    assert(stats.channels[3].max > 0);
    assert(stats.channels[3].min === 0);
    assert(stats.channels[3].mean < 10);
  }
});
