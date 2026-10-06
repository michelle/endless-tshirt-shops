// Verify the Stripe webhook signature path without creating a real order.
import crypto from 'node:crypto';
import fs from 'node:fs';

const state = JSON.parse(fs.readFileSync(new URL('../runtime/webhook.json', import.meta.url), 'utf8'));
const secret = state.secret;
const base = process.env.BASE || 'http://localhost:8788';
const sid = process.argv[2] || 'cs_test_unpaid_placeholder';

const payload = JSON.stringify({
  id: 'evt_test_' + Date.now(),
  object: 'event',
  type: 'checkout.session.completed',
  data: { object: { id: sid, object: 'checkout.session', payment_status: 'unpaid', status: 'open' } },
});

function sign(body, s) {
  const t = Math.floor(Date.now() / 1000);
  const v1 = crypto.createHmac('sha256', s).update(`${t}.${body}`).digest('hex');
  return `t=${t},v1=${v1}`;
}

const good = await fetch(`${base}/api/stripe/webhook`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'stripe-signature': sign(payload, secret) },
  body: payload,
});
console.log('valid signature  ->', good.status, await good.text());

const bad = await fetch(`${base}/api/stripe/webhook`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'stripe-signature': 't=1,v1=deadbeef' },
  body: payload,
});
console.log('bad signature    ->', bad.status, (await bad.text()).slice(0, 80));
