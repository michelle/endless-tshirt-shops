import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import type Stripe from 'stripe';
import { signMoment, verifyMoment, storeId } from '../lib/server';
import { validatePaidSession } from '../lib/fulfillment';
import { renderArtwork } from '../lib/artwork';
import { printItem } from '../lib/prodigi';
process.env.ARTWORK_SIGNING_SECRET = 'test-only-signing-secret-never-deploy';
process.env.APP_URL = 'https://test.example.com';
process.env.COMMERCE_MODE = 'test';
const moment = { timestamp: 1788645123456, style: 'unisex' as const, size: 'M' as const };
const token = signMoment(moment);
const validSession = () => ({ id: 'cs_test_example', metadata: { store_id: storeId(), timestamp: String(moment.timestamp), style: moment.style, size: moment.size, artwork_token: token }, amount_total: 2250, currency: 'usd', payment_status: 'paid', status: 'complete', livemode: false }) as unknown as Stripe.Checkout.Session;

test('signed moments reject forged timestamps and malformed tokens', () => {
  assert.deepEqual(verifyMoment(token), moment);
  const payload = Buffer.from(JSON.stringify({ ...moment, timestamp: 1000000000000, version: 1 })).toString('base64url');
  assert.throws(() => verifyMoment(`${payload}.${token.split('.')[1]}`));
  for (const invalid of ['', 'a.b', `${token}.extra`, 'x'.repeat(700)]) assert.throws(() => verifyMoment(invalid));
});
test('fulfillment requires a paid complete session, correct amount, store and environment', () => {
  assert.deepEqual(validatePaidSession(validSession()), moment);
  for (const patch of [{ payment_status: 'unpaid' }, { status: 'open' }, { amount_total: 1 }, { currency: 'eur' }, { livemode: true }]) {
    assert.throws(() => validatePaidSession({ ...validSession(), ...patch } as Stripe.Checkout.Session));
  }
  const wrongStore = validSession(); wrongStore.metadata!.store_id = 'someone-else';
  assert.throws(() => validatePaidSession(wrongStore));
  const swappedSize = validSession(); swappedSize.metadata!.size = 'XL';
  assert.throws(() => validatePaidSession(swappedSize));
});
test('both fits map to validated Prodigi SKUs and supported print attributes', () => {
  const item = printItem(moment, 'https://example.com/art.png');
  assert.equal(item.sku, 'GLOBAL-TEE-GIL-5000');
  assert.deepEqual(item.attributes, { color: 'black', size: 'm' });
  assert.equal(item.assets[0].printArea, 'front');
  assert.equal(printItem({ ...moment, style: 'fitted', size: 'XL' }).sku, 'GLOBAL-TEE-BC-3001');
});
test('print artwork is transparent, reproducible, 300 DPI and matches Prodigi dimensions', async () => {
  const png = await renderArtwork(moment.timestamp);
  const metadata = await sharp(png).metadata();
  assert.equal(metadata.width, 4677); assert.equal(metadata.height, 5881);
  assert.equal(metadata.density, 300); assert.equal(metadata.hasAlpha, true);
  assert.deepEqual(png, await renderArtwork(moment.timestamp));
  assert.notDeepEqual(png, await renderArtwork(moment.timestamp + 1));
  const corner = await sharp(png).extract({ left: 0, top: 0, width: 1, height: 1 }).raw().toBuffer();
  assert.equal(corner[3], 0);
  const stats = await sharp(png).stats();
  assert.ok(stats.channels[3].max > 0); assert.ok(stats.channels[3].mean < 20);
});
