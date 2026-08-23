import Stripe from 'stripe';

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  client = new Stripe(key, {
    // Pin the API version so a Stripe-side upgrade can never change behaviour
    // underneath a deployed build.
    apiVersion: '2025-08-27.basil',
    appInfo: { name: 'datetime.store', version: '1.0.0' },
    maxNetworkRetries: 2,
  });
  return client;
}

export function isLiveMode(): boolean {
  const key = process.env.STRIPE_SECRET_KEY ?? '';
  return key.startsWith('sk_live_') || key.startsWith('rk_live_');
}
