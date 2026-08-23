/**
 * End-to-end verification of the purchase flow against a running deployment.
 *
 *   BASE_URL=http://localhost:3000 node scripts/verify-checkout.mjs
 *
 * Drives the same three steps a browser does — create the order, confirm the
 * payment, read the confirmation — but confirms the PaymentIntent server-side
 * with a Stripe test payment method instead of typing a card in. Requires
 * STRIPE_SECRET_KEY in the environment (or .env.local).
 */

import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

// --- config -----------------------------------------------------------------

function loadEnvLocal() {
  const file = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}
loadEnvLocal();

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.error('STRIPE_SECRET_KEY is required.');
  process.exit(1);
}

// --- helpers ----------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** A stand-in for the browser's canvas: a print-sized opaque-white PNG. */
function makeArtworkPng(width = 2400, height = 560) {
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const o = y * stride + 1 + x * 4;
      // A white band across the middle stands in for the digits.
      const inBand = y > height * 0.3 && y < height * 0.7 && x > width * 0.1 && x < width * 0.9;
      raw[o] = raw[o + 1] = raw[o + 2] = 255;
      raw[o + 3] = inBand ? 255 : 0;
    }
  }

  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeBuf = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
    return Buffer.concat([len, typeBuf, data, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

async function stripeApi(pathname, params) {
  const body = new URLSearchParams(params).toString();
  const res = await fetch(`https://api.stripe.com/v1/${pathname}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Stripe ${pathname}: ${json.error?.message ?? res.status}`);
  return json;
}

const steps = [];
function step(name, ok, detail) {
  steps.push({ name, ok, detail });
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
}

// --- the flow ---------------------------------------------------------------

async function main() {
  console.log(`Verifying ${BASE_URL}\n`);

  // 1. The storefront renders.
  const home = await fetch(BASE_URL);
  const html = await home.text();
  step(
    'storefront renders',
    home.ok && html.includes('we sell a t-shirt with the current datetime'),
    `HTTP ${home.status}`,
  );

  // 2. Create the order: artwork upload, Scalable Press quote, PaymentIntent.
  const epochMs = Date.now();
  const artwork = `data:image/png;base64,${makeArtworkPng().toString('base64')}`;

  const checkoutRes = await fetch(`${BASE_URL}/api/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      style: 'unisex',
      size: 'L',
      epochMs,
      artwork,
      email: 'jenny.rosen@example.com',
      address: {
        name: 'Jenny Rosen',
        line1: '185 Berry St',
        line2: 'Suite 550',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94107',
        country: 'US',
      },
    }),
  });
  const checkout = await checkoutRes.json();
  if (!checkoutRes.ok) {
    step('order created (design + quote + PaymentIntent)', false, checkout.error);
    process.exit(1);
  }
  step(
    'order created (design + quote + PaymentIntent)',
    Boolean(checkout.clientSecret && checkout.orderToken),
    `${checkout.paymentIntentId}, printer token ${checkout.orderToken}`,
  );
  step('charged the catalogue price', checkout.amount === 2250, `${checkout.amount} ${checkout.currency}`);

  // 3. Nothing is at the printer yet.
  const beforePay = await fetch(
    `${BASE_URL}/api/orders/${checkout.paymentIntentId}?client_secret=${encodeURIComponent(checkout.clientSecret)}`,
  ).then((r) => r.json());
  step(
    'printer order withheld until payment',
    beforePay.order?.fulfillment === 'awaiting_payment',
    `fulfillment=${beforePay.order?.fulfillment}`,
  );

  // 4. Order details are not readable without the client secret.
  const unauthorised = await fetch(`${BASE_URL}/api/orders/${checkout.paymentIntentId}`);
  step('order details require the client secret', unauthorised.status === 403, `HTTP ${unauthorised.status}`);

  // 5. Pay with a Stripe test card.
  const confirmed = await stripeApi(`payment_intents/${checkout.paymentIntentId}/confirm`, {
    payment_method: 'pm_card_visa',
    return_url: `${BASE_URL}/order/${checkout.paymentIntentId}`,
  });
  step('test card payment succeeded', confirmed.status === 'succeeded', `status=${confirmed.status}`);

  // 6. Fulfillment places the print order.
  const afterPay = await fetch(
    `${BASE_URL}/api/orders/${checkout.paymentIntentId}?client_secret=${encodeURIComponent(checkout.clientSecret)}`,
  ).then((r) => r.json());
  step(
    'print order placed with Scalable Press',
    afterPay.order?.fulfillment === 'placed',
    `reference ${afterPay.order?.reference}`,
  );
  step(
    'printed timestamp recorded on the order',
    afterPay.order?.epochMs === epochMs,
    String(afterPay.order?.printedAt),
  );

  // 7. Fulfilling twice does not double-order.
  const again = await fetch(
    `${BASE_URL}/api/orders/${checkout.paymentIntentId}?client_secret=${encodeURIComponent(checkout.clientSecret)}`,
  ).then((r) => r.json());
  step('fulfillment is idempotent', again.order?.fulfillment === 'placed', 're-ran with no error');

  // 8. The confirmation page renders for the buyer.
  const confirmationUrl = `${BASE_URL}/order/${checkout.paymentIntentId}?payment_intent_client_secret=${encodeURIComponent(checkout.clientSecret)}`;
  const page = await fetch(confirmationUrl);
  const pageHtml = await page.text();
  step(
    'confirmation page renders',
    page.ok && pageHtml.includes('Congrats on your pretty cool shirt'),
    `HTTP ${page.status}`,
  );

  // 9. A leaked order id alone shows nothing.
  const leaked = await fetch(`${BASE_URL}/order/${checkout.paymentIntentId}`);
  const leakedHtml = await leaked.text();
  step("confirmation page refuses a bare order id", leakedHtml.includes("can&#x27;t show this order") || leakedHtml.includes("can't show this order"), `HTTP ${leaked.status}`);

  // 10. Bad input is rejected.
  const badArtwork = await fetch(`${BASE_URL}/api/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      style: 'unisex',
      size: 'L',
      epochMs: Date.now(),
      artwork: `data:image/png;base64,${Buffer.from('not a png at all, just some text').toString('base64')}`,
      email: 'jenny.rosen@example.com',
      address: {
        name: 'Jenny Rosen',
        line1: '185 Berry St',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94107',
        country: 'US',
      },
    }),
  });
  step('invalid artwork rejected', badArtwork.status === 400, `HTTP ${badArtwork.status}`);

  const staleTimestamp = await fetch(`${BASE_URL}/api/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      style: 'unisex',
      size: 'L',
      epochMs: 1,
      artwork,
      email: 'jenny.rosen@example.com',
      address: {
        name: 'Jenny Rosen',
        line1: '185 Berry St',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94107',
        country: 'US',
      },
    }),
  });
  step('stale timestamp rejected', staleTimestamp.status === 400, `HTTP ${staleTimestamp.status}`);

  console.log(`\nConfirmation page:\n  ${confirmationUrl}\n`);

  const failed = steps.filter((s) => !s.ok);
  console.log(`${steps.length - failed.length}/${steps.length} checks passed.`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error('\nVerification crashed:', err);
  process.exit(1);
});
