// End-to-end smoke test, no browser needed:
//   store checkout → real Stripe Checkout Session → pay it through the same
//   confirm call the hosted page makes (test card + shipping details) →
//   store's order endpoint verifies payment with Stripe and fulfils →
//   a real Prodigi order comes back.
// Usage: node scripts/smoke.mjs [base-url]   (default http://localhost:3457)

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { homedir } from 'node:os';

const DIR = path.join(homedir(), '.contour-secrets');
const BASE = (process.argv[2] || 'http://localhost:3457').replace(/\/$/, '');
const SK = process.env.STRIPE_SECRET_KEY || readFileSync(path.join(DIR, 'sk.txt'), 'utf8').trim();
const PK = process.env.STRIPE_PUBLISHABLE_KEY || readFileSync(path.join(DIR, 'pk.txt'), 'utf8').trim();

const DESIGN = {
  title: 'E2E Smoke Test',
  place: 'Zermatt, Switzerland',
  lat: 45.9763, lng: 7.6586,
  extent: 'massif', colorKey: 'black', sizeKey: 'l', qty: 1,
  country: 'US', shippingMethod: 'budget',
};

function form(obj) {
  const out = [];
  const walk = (o, prefix) => {
    for (const [k, v] of Object.entries(o)) {
      if (v === undefined || v === null) continue;
      const key = prefix ? `${prefix}[${k}]` : k;
      if (typeof v === 'object') walk(v, key);
      else out.push([key, String(v)]);
    }
  };
  walk(obj, '');
  return new URLSearchParams(out).toString();
}

async function stripe(method, path_, params) {
  const res = await fetch(`https://api.stripe.com/v1${path_}`, {
    method,
    headers: {
      Authorization: `Bearer ${method === 'CONFIRM-PK' ? PK : SK}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params ? form(params) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`stripe ${path_} → ${res.status}: ${json?.error?.message}`);
  return json;
}

console.log('1. POST /api/checkout →', BASE);
const co = await fetch(`${BASE}/api/checkout`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(DESIGN),
});
const checkout = await co.json();
if (!co.ok) throw new Error('checkout failed: ' + JSON.stringify(checkout));
console.log('   session:', checkout.sessionId, 'total $' + (checkout.totalCents / 100).toFixed(2));
console.log('   hosted url:', checkout.url.slice(0, 60) + '…');

console.log('2. paying the session through the hosted page confirm API (tok_visa + shipping)');
const paid = await fetch(`https://api.stripe.com/v1/payment_pages/${checkout.sessionId}/confirm`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${PK}`, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: form({
    payment_method_data: {
      type: 'card',
      card: { token: 'tok_visa' },
      billing_details: { name: 'Smoke Tester', email: 'smoke@example.com' },
    },
    expected_payment_method_type: 'card',
    shipping: {
      name: 'Smoke Tester',
      address: { line1: '14 Test Place', city: 'Testville', state: 'CA', postal_code: '94103', country: 'US' },
    },
  }),
});
const paidJson = await paid.json();
if (!paid.ok) throw new Error('confirm failed: ' + JSON.stringify(paidJson).slice(0, 300));
console.log('   payment_status:', paidJson.payment_status);

console.log('3. GET /api/order?session_id=… (store re-verifies with Stripe, then fulfils)');
let order = null;
for (let i = 0; i < 5; i++) {
  const r = await fetch(`${BASE}/api/order?session_id=${checkout.sessionId}`);
  order = await r.json();
  if (order.fulfilled) break;
  await new Promise((r2) => setTimeout(r2, 3000));
}
console.log('   paid:', order.paid, '· status:', order.status, '· prodigi:', order.prodigiOrderId);
if (!order.prodigiOrderId) {
  console.error('   fulfilment did not complete:', order.error || order.reason);
  process.exit(1);
}

console.log('4. Prodigi order live status:');
const KEY = process.env.PRODIGI_API_KEY;
const pr = await fetch(`https://api.sandbox.prodigi.com/v4.0/Orders/${order.prodigiOrderId}`, {
  headers: { 'X-API-Key': KEY },
});
const pj = await pr.json();
const o = pj.order;
console.log('   id:', o.id, '· stage:', o.status.stage, '· items:', o.items.map((i) => `${i.sku} ${i.status}`));
console.log('   asset url:', o.items[0].assets[0]?.url);

console.log('5. fetching the print file (what Prodigi downloads):');
const assetRes = await fetch(o.items[0].assets[0].url);
const buf = Buffer.from(await assetRes.arrayBuffer());
console.log('   HTTP', assetRes.status, '·', assetRes.headers.get('content-type'), '·', (buf.length / 1024).toFixed(0) + ' KB');
const pngHeader = buf.subarray(1, 4).toString('hex');
if (assetRes.status !== 200 || pngHeader !== '504e47') throw new Error('print file fetch failed');
const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
console.log('   PNG dimensions:', w, 'x', h);

console.log('\n✅ end-to-end OK: paid checkout → fulfilment → Prodigi order', o.id);
