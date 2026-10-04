// End-to-end fulfillment test against the LOCAL dev server:
//   checkout -> Stripe test payment -> signed webhook -> Prodigi sandbox order -> status API
// Usage: node tests/e2e-local.js
'use strict';
process.env.APP_URL = process.env.APP_URL || 'http://localhost:3100';
const crypto = require('crypto');

const APP = process.env.APP_URL;
const SK = process.env.STRIPE_SECRET_KEY;
const WHSEC = process.env.STRIPE_WEBHOOK_SECRET;

const spec = {
  title: 'E2E test night',
  date: '2026-03-14',
  time: '21:34',
  utc: '2026-03-15T01:34:00Z',
  localOffsetMin: -240,
  lat: 40.7128,
  lng: -74.006,
  place: 'New York City',
  theme: 'chart-cream',
  size: 'm',
  qty: 1,
};

async function main() {
  // 1. checkout
  const co = await fetch(`${APP}/api/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(spec),
  });
  const coJ = await co.json();
  if (!co.ok) throw new Error('checkout failed: ' + JSON.stringify(coJ));
  console.log('1. checkout session:', coJ.sessionId);

  // 2. pay it with Stripe's documented test-mode flow (same steps the checkout page does):
  //    load the payment page, create a test payment method, confirm.
  const auth = { Authorization: `Bearer ${SK}` };
  const page = await (await fetch(`https://api.stripe.com/v1/payment_pages/${coJ.sessionId}`, { headers: auth })).json();
  if (page.error) throw new Error('payment page load failed: ' + page.error.message);
  console.log('2a. payment page loaded, amount:', page.amount_total ?? page.amount);
  const pm = await (await fetch('https://api.stripe.com/v1/payment_methods', {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'type=card&card[token]=tok_visa&billing_details[name]=Testy+McTestface&billing_details[email]=testy@example.com&billing_details[address[line1]]=14+Test+Place&billing_details[address[city]]=Testerton&billing_details[address[postal_code]]=12345&billing_details[address[country]]=US',
  })).json();
  if (pm.error) throw new Error('payment method failed: ' + pm.error.message);
  // expected_amount from our pricing constants (payment_pages totals stay null until hosted render)
  const { PRICE_USD, SHIPPING_USD } = require('../lib/design');
  const expected = (PRICE_USD * spec.qty + SHIPPING_USD) * 100;
  const conf = await (await fetch(`https://api.stripe.com/v1/payment_pages/${coJ.sessionId}/confirm`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `payment_method=${pm.id}&expected_amount=${Math.round(expected)}`,
  })).json();
  if (conf.error) throw new Error('confirm failed: ' + conf.error.message);
  console.log('2b. payment page status:', conf.status);

  // 3. the REAL webhook arrives via `stripe listen --forward-to` (or the registered
  //    endpoint in production); give it a moment and then verify fulfilment happened.
  const sess2 = await (await fetch(`https://api.stripe.com/v1/checkout/sessions/${coJ.sessionId}?expand[]=customer_details`, {
    headers: auth,
  })).json();
  console.log('3. session payment_status:', sess2.payment_status);
  if (sess2.payment_status !== 'paid') throw new Error('session not paid');

  // 4. order status via our API (authoritative Prodigi lookup by session)
  await new Promise((r) => setTimeout(r, 1500));
  const st = await (await fetch(`${APP}/api/order/x?session=${coJ.sessionId}`)).json();
  console.log('4. order status:', JSON.stringify({ placed: st.placed, prodigiOrderId: st.prodigiOrderId, stage: st.stage, size: st.size, qty: st.qty }));
  if (!st.placed) throw new Error('order not placed');

  // 5. idempotency: second webhook must not create a duplicate print order
  const wh2 = await fetch(`${APP}/api/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'stripe-signature': sig },
    body: payload,
  });
  console.log('5. duplicate webhook handled:', wh2.status);
  const st2 = await (await fetch(`${APP}/api/order/x?session=${coJ.sessionId}`)).json();
  if (st2.prodigiOrderId !== st.prodigiOrderId) throw new Error('DUPLICATE ORDER CREATED');
  console.log('OK: no duplicate Prodigi order');
  console.log('\nE2E PASS — print asset url:', st.printAssetUrl);
}

main().catch((e) => {
  console.error('E2E FAIL:', e.message);
  process.exit(1);
});
