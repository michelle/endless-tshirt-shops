// Environment/secrets resolution. Precedence: env var → ~/.contour-secrets file → fail.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { homedir } from 'node:os';

const DIR = path.join(homedir(), '.contour-secrets');

function fromFile(name) {
  try { return readFileSync(path.join(DIR, name), 'utf8').trim(); } catch { return ''; }
}

export function loadConfig() {
  const cfg = {
    stripeSecretKey: process.env.STRIPE_SECRET_KEY || fromFile('sk.txt'),
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || fromFile('pk.txt'),
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || fromFile('webhook.secret'),
    prodigiApiKey: process.env.PRODIGI_API_KEY || '',
    prodigiEnv: process.env.PRODIGI_ENV === 'live' ? 'live' : 'sandbox',
    printSigningSecret: process.env.PRINT_SIGNING_SECRET || fromFile('print-signing.secret'),
    publicBaseUrl: process.env.PUBLIC_BASE_URL || '',
    port: Number(process.env.PORT || 3457),
  };
  // Generate + persist the print-signing secret on first boot so print URLs
  // keep working across restarts (Prodigi may re-fetch files later).
  if (!cfg.printSigningSecret) {
    cfg.printSigningSecret = crypto.randomBytes(32).toString('hex');
    try { writeFileSync(path.join(DIR, 'print-signing.secret'), cfg.printSigningSecret, { mode: 0o600 }); } catch {}
  }
  if (!cfg.prodigiApiKey) throw new Error('PRODIGI_API_KEY is required');
  if (!cfg.stripeSecretKey) throw new Error('Stripe secret key is required (STRIPE_SECRET_KEY or ~/.contour-secrets/sk.txt)');
  cfg.paymentsReady = /^(sk|rk|rkcs)_test_|^sk_live_/.test(cfg.stripeSecretKey);
  return cfg;
}

export function saveSecret(name, value) {
  try { writeFileSync(path.join(DIR, name), value, { mode: 0o600 }); } catch {}
}

export const secretsDir = DIR;
export { existsSync };
