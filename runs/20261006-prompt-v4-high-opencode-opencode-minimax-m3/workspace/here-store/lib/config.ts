/**
 * Boot-time & runtime configuration.
 * Read from environment, with safe fallbacks for sandbox / development.
 */

const PROD_BASE = 'https://api.prodigi.com';
const SANDBOX_BASE = 'https://api.sandbox.prodigi.com';

export function prodigiBaseUrl(): string {
  const override = process.env.PRODIGI_BASE_URL;
  if (override) return override;
  // Use sandbox if no explicit live key set, or PRODIGI_USE_LIVE not "1"
  const useLive =
    process.env.PRODIGI_USE_LIVE === '1' &&
    !!process.env.PRODIGI_LIVE_API_KEY;
  return useLive ? PROD_BASE : SANDBOX_BASE;
}

export function prodigiApiKey(): string {
  const useLive =
    process.env.PRODIGI_USE_LIVE === '1' &&
    !!process.env.PRODIGI_LIVE_API_KEY;
  if (useLive) return process.env.PRODIGI_LIVE_API_KEY!;
  return process.env.PRODIGI_API_KEY ?? '';
}

export function isStripeLive(): boolean {
  const k = process.env.STRIPE_SECRET_KEY || '';
  return k.startsWith('sk_live_') || k.startsWith('sk_');
}

export function stripeSecretKey(): string {
  return process.env.STRIPE_SECRET_KEY || '';
}

export function stripeWebhookSecret(): string {
  return process.env.STRIPE_WEBHOOK_SECRET || '';
}

export function publicBaseUrl(request?: Request): string {
  // For Vercel deploys
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;

  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  if (request) {
    try {
      const u = new URL(request.url);
      return `${u.protocol}//${u.host}`;
    } catch {
      /* ignore */
    }
  }

  return 'http://localhost:3000';
}

/** Mock payment mode — when no Stripe key is configured we expose a local
 *  "complete" endpoint that pretends a payment succeeded. This is intended
 *  for end-to-end demos when no Stripe account is available. */
export function isMockPayments(): boolean {
  return !process.env.STRIPE_SECRET_KEY;
}
