// E2E pipeline test: create a REAL checkout session via the deployed
// /api/checkout, then simulate its checkout.session.completed webhook
// (signed exactly like Stripe) against the deployed app.
// Usage: npx tsx scripts/e2e-webhook.mts <prodUrl> <webhookSecret>
import crypto from 'crypto';

const [, , prodUrl, webhookSecret] = process.argv;
if (!prodUrl || !webhookSecret) {
  console.error('usage: e2e-webhook.mts <prodUrl> <webhookSecret>');
  process.exit(1);
}

const customization = { text: 'Roam', style: 'arc', ink: 'chalk', shirt: 'black', size: 'm' };

// 1. Real session
const checkoutRes = await fetch(`${prodUrl}/api/checkout`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(customization),
});
const { url } = (await checkoutRes.json()) as { url: string };
const sessionId = new URL(url).pathname.split('/').pop()!;
if (!sessionId.startsWith('cs_test_')) throw new Error('unexpected session id: ' + sessionId);
console.log('SESSION_ID=' + sessionId);

// 2. Signed webhook event referencing the real session
const event = {
  id: `evt_e2e_${Date.now()}`,
  object: 'event',
  created: Math.floor(Date.now() / 1000),
  type: 'checkout.session.completed',
  livemode: false,
  data: {
    object: {
      id: sessionId,
      object: 'checkout.session',
      mode: 'payment',
      payment_status: 'paid',
      status: 'complete',
      metadata: customization,
      shipping_details: {
        name: 'E2E Test Recipient',
        address: {
          line1: '123 Market Street',
          line2: 'Apt 4',
          city: 'San Francisco',
          state: 'CA',
          postal_code: '94103',
          country: 'US',
        },
      },
      customer_details: { email: 'e2e@example.com', name: 'E2E Test Recipient' },
    },
  },
};

const payload = JSON.stringify(event);
const t = Math.floor(Date.now() / 1000);
const v1 = crypto.createHmac('sha256', webhookSecret).update(`${t}.${payload}`).digest('hex');

const res = await fetch(`${prodUrl}/api/webhooks/stripe`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Stripe-Signature': `t=${t},v1=${v1}` },
  body: payload,
});
console.log('WEBHOOK_HTTP', res.status);
console.log(await res.text());

// Save payload for the idempotency replay
const { writeFileSync } = await import('fs');
writeFileSync('/tmp/e2e-event.json', JSON.stringify({ payload, t, v1, sessionId }));
