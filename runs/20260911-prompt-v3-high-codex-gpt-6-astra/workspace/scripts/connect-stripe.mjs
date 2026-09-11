// Run with Node 22 after securely supplying STRIPE_SECRET_KEY in your shell.
// Creates a test webhook and uploads keys without printing any secret.
import Stripe from 'stripe';
import { execFileSync } from 'node:child_process';
const key = process.env.STRIPE_SECRET_KEY;
const url = process.env.APP_URL;
if (!(key?.startsWith('sk_test_') || key?.startsWith('rkcs_test_')) || !url?.startsWith('https://'))
  throw new Error('Set STRIPE_SECRET_KEY (test key) and APP_URL first.');
const client = new Stripe(key);
const endpointUrl = url + '/api/webhooks/stripe';
const existing = await client.webhookEndpoints.list({ limit: 100 });
if (existing.data.some((e) => e.url === endpointUrl))
  throw new Error(
    'A webhook already exists for this URL. Set its existing signing secret in Vercel; do not create duplicates.',
  );
const endpoint = await client.webhookEndpoints.create({
  url: endpointUrl,
  enabled_events: [
    'checkout.session.completed',
    'checkout.session.async_payment_succeeded',
  ],
  description: 'After Hours test checkout fulfillment',
});
if (!endpoint.secret)
  throw new Error('Stripe did not return the signing secret.');
for (const [name, value] of Object.entries({
  STRIPE_SECRET_KEY: key,
  STRIPE_WEBHOOK_SECRET: endpoint.secret,
})) {
  execFileSync('vercel', ['env', 'add', name, 'production'], {
    input: value,
    stdio: ['pipe', 'ignore', 'pipe'],
  });
}
console.log('Stripe test checkout configured. Webhook:', endpoint.id);
console.log('Redeploy with: vercel --prod --yes');
