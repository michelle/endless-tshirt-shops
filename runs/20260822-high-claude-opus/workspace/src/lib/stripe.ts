import Stripe from 'stripe';

let client: Stripe | null = null;

/** Lazily constructed so a missing key surfaces at request time, not build time. */
export function stripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not configured.');
    client = new Stripe(key, {
      appInfo: { name: 'datetime.store', version: '2.0.0' },
    });
  }
  return client;
}

export function publishableKey(): string | undefined {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
}
