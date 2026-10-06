// Registers/updates the Stripe webhook endpoint for the current public URL.
// Usage: node scripts/register-webhook.mjs <https://…> [--delete]
// The endpoint secret is saved to ~/.contour-secrets/webhook.secret (stable
// across URL changes, so the server keeps verifying signatures after updates).

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { homedir } from 'node:os';
import { createStripeApi } from '../lib/stripeapi.mjs';

const DIR = path.join(homedir(), '.contour-secrets');
const url = process.argv[2];
if (!url || !/^https:\/\//.test(url)) {
  console.error('usage: node scripts/register-webhook.mjs https://<public-url>');
  process.exit(1);
}
const key = process.env.STRIPE_SECRET_KEY || readFileSync(path.join(DIR, 'sk.txt'), 'utf8').trim();
const stripe = createStripeApi(key);
const webhookUrl = url.replace(/\/$/, '') + '/api/stripe-webhook';
const EVENTS = ['checkout.session.completed', 'checkout.session.async_payment_succeeded'];

if (process.argv.includes('--delete')) {
  const { data } = await stripe.listWebhookEndpoints();
  for (const ep of data) {
    if (ep.url.includes('/api/stripe-webhook') && ep.url.includes('trycloudflare.com')) {
      await stripe.deleteWebhookEndpoint(ep.id);
      console.log('deleted', ep.id, ep.url);
    }
  }
  process.exit(0);
}

const { data } = await stripe.listWebhookEndpoints();
let existing = data.find((ep) => ep.url === webhookUrl);
let secret = null;

if (existing) {
  // still (re)point events at the current set; URL is already right
  const updated = await stripe.updateWebhookEndpoint(existing.id, {
    enabled_events: EVENTS,
    description: 'contours-store',
  });
  console.log('webhook already registered:', updated.id, updated.url);
} else {
  const created = await stripe.createWebhookEndpoint({
    url: webhookUrl,
    enabled_events: EVENTS,
    description: 'contours-store',
  });
  secret = created.secret;
  console.log('webhook created:', created.id, created.url);
}

// the create response is the only place the secret is returned — persist it
const secretFile = path.join(DIR, 'webhook.secret');
if (secret) writeFileSync(secretFile, secret, { mode: 0o600 });
if (!existsSync(secretFile)) {
  console.error('NOTE: webhook secret not saved (created earlier without secret capture). Re-create or set it manually.');
} else if (secret) {
  console.log('webhook secret saved →', secretFile);
}
