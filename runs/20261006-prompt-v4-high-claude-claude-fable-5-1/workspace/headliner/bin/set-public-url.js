// Records the current public URL and makes sure Stripe has a webhook
// endpoint pointing at it. Called by bin/tunnel.sh whenever the quick
// tunnel (re)starts, and usable by hand: node bin/set-public-url.js https://host
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Stripe from 'stripe';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RUNTIME = path.resolve(__dirname, '../data/runtime.json');
const url = (process.argv[2] || '').replace(/\/$/, '');
if (!/^https:\/\//.test(url)) { console.error('usage: set-public-url.js https://public-host'); process.exit(1); }

let rt = {};
try { rt = JSON.parse(fs.readFileSync(RUNTIME, 'utf8')); } catch {}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const whUrl = `${url}/api/stripe/webhook`;
const events = ['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed'];

let endpoint = null;
if (rt.stripeWebhookId) {
  try { endpoint = await stripe.webhookEndpoints.retrieve(rt.stripeWebhookId); } catch { endpoint = null; }
}
if (endpoint && endpoint.status !== 'disabled') {
  if (endpoint.url !== whUrl) endpoint = await stripe.webhookEndpoints.update(endpoint.id, { url: whUrl, disabled: false });
} else {
  endpoint = await stripe.webhookEndpoints.create({ url: whUrl, enabled_events: events, description: 'HEADLINER store (auto-managed by bin/tunnel.sh)' });
  rt.stripeWebhookSecret = endpoint.secret; // only returned on create
}
rt.appUrl = url;
rt.stripeWebhookId = endpoint.id;
rt.updatedAt = new Date().toISOString();
fs.mkdirSync(path.dirname(RUNTIME), { recursive: true });
fs.writeFileSync(RUNTIME + '.tmp', JSON.stringify(rt, null, 2));
fs.renameSync(RUNTIME + '.tmp', RUNTIME);
console.log(`[set-public-url] app=${url} webhook=${endpoint.id} -> ${endpoint.url}`);
