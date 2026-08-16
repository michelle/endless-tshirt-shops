/**
 * End-to-end checkout verification against a running deployment.
 *
 * Exercises the real path a customer takes — Scalable Press design + quote,
 * a Stripe card payment, then order submission — without a browser:
 *
 *   node scripts/verify-flow.mjs [baseUrl]
 *
 * Needs STRIPE_SECRET_KEY in the environment to confirm the PaymentIntent the
 * way Stripe.js would. Reads .env.local if present.
 */

import fs from 'node:fs';
import zlib from 'node:zlib';

const BASE = process.argv[2] ?? 'http://localhost:3111';

loadDotEnv('.env.local');
const SECRET = process.env.STRIPE_SECRET_KEY;
if (!SECRET) fail('STRIPE_SECRET_KEY is required to confirm the test payment.');

const timestamp = Date.now();
console.log(`→ verifying ${BASE} with timestamp ${timestamp}`);

// 1. Quote: uploads artwork to Scalable Press and opens a PaymentIntent.
const quoteRes = await fetch(`${BASE}/api/quote`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    shirt: {
      style: 'unisex',
      size: 'M',
      timestamp,
      artwork: `data:image/png;base64,${syntheticArtwork().toString('base64')}`,
    },
    email: 'verify@example.com',
    address: {
      name: 'Jenny Rosen',
      address1: '185 Berry St',
      address2: 'Suite 550',
      city: 'San Francisco',
      state: 'CA',
      zip: '94107',
    },
  }),
});
const quote = await quoteRes.json();
if (!quoteRes.ok) fail(`/api/quote -> ${quoteRes.status} ${JSON.stringify(quote)}`);
console.log(
  `✓ quote ok — ${quote.paymentIntentId}, charging ${quote.amount / 100} ${quote.currency}, ` +
    `ships in ${quote.shipsInBusinessDays ?? '?'} business days`,
);

// 2. Confirm the payment with a Stripe test card, standing in for Stripe.js.
const confirmRes = await fetch(
  `https://api.stripe.com/v1/payment_intents/${quote.paymentIntentId}/confirm`,
  {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${SECRET}:`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ payment_method: 'pm_card_visa' }),
  },
);
const intent = await confirmRes.json();
if (intent.status !== 'succeeded') fail(`payment did not succeed: ${JSON.stringify(intent)}`);
console.log(`✓ payment succeeded — charge ${intent.latest_charge}`);

// 3. Fulfil.
const orderRes = await fetch(`${BASE}/api/order`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ paymentIntentId: quote.paymentIntentId }),
});
const order = await orderRes.json();
if (!orderRes.ok) fail(`/api/order -> ${orderRes.status} ${JSON.stringify(order)}`);
console.log(
  `✓ order ${order.reference} (${order.orderId}) — ${order.live ? 'LIVE production order' : 'dry run, nothing printed'}`,
);

// 4. Fulfilment must be idempotent: a repeat call must not order a second shirt.
const repeatRes = await fetch(`${BASE}/api/order`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ paymentIntentId: quote.paymentIntentId }),
});
const repeat = await repeatRes.json();
if (repeat.orderId !== order.orderId) {
  fail(`idempotency broken: ${order.orderId} then ${repeat.orderId}`);
}
console.log('✓ repeat fulfilment is idempotent');

// 5. Bad input must be rejected before anything is charged.
const badRes = await fetch(`${BASE}/api/quote`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ shirt: { style: 'gold-plated', size: 'M', timestamp, artwork: 'x' } }),
});
if (badRes.status !== 400) fail(`invalid input returned ${badRes.status}, expected 400`);
console.log('✓ invalid input rejected with 400');

console.log('\nAll checks passed.');

// --------------------------------------------------------------------------

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function loadDotEnv(path) {
  if (!fs.existsSync(path)) return;
  for (const line of fs.readFileSync(path, 'utf8').split('\n')) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

/** A valid 300 DPI-sized PNG. The browser draws real digits; this is a stand-in
 *  so the script needs no canvas. */
function syntheticArtwork() {
  const width = 2400;
  const height = 400;
  const rgba = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const inBand = y > 120 && y < 280 && x > 60 && x < width - 60;
      rgba[i] = rgba[i + 1] = rgba[i + 2] = 255;
      rgba[i + 3] = inBand ? 255 : 0;
    }
  }
  return encodePng(width, height, rgba);
}

function encodePng(width, height, rgba) {
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  const crc32 = (buf) => {
    let crc = 0xffffffff;
    for (const byte of buf) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typed = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typed));
    return Buffer.concat([len, typed, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
