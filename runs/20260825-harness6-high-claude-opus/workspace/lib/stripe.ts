import Stripe from 'stripe';

let client: Stripe | null = null;

export function stripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new ConfigError('STRIPE_SECRET_KEY is not set on this deployment.');
  }
  return key;
}

export function getStripe(): Stripe {
  if (!client) {
    client = new Stripe(stripeSecretKey(), {
      appInfo: { name: 'datetime.store', version: '1.0.0' },
      maxNetworkRetries: 2,
      timeout: 20_000,
    });
  }
  return client;
}

export class ConfigError extends Error {
  readonly status = 503;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function isLiveMode(): boolean {
  const key = process.env.STRIPE_SECRET_KEY ?? '';
  return key.startsWith('sk_live') || key.startsWith('rk_live');
}
