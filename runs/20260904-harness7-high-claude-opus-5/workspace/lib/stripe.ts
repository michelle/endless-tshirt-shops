import Stripe from 'stripe';

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  client = new Stripe(key, {
    // Pinning the API version keeps Stripe's own upgrades from changing the
    // shape of objects this code reads out from under it.
    apiVersion: '2025-08-27.basil',
    appInfo: { name: 'datetime.store', version: '1.0.0' },
    maxNetworkRetries: 2,
  });
  return client;
}

/** True when we are pointed at Stripe test mode. Drives the on-page banner. */
export function isTestMode(): boolean {
  const key = process.env.STRIPE_SECRET_KEY ?? '';
  return !key.startsWith('sk_live_') && !key.startsWith('rk_live_');
}
