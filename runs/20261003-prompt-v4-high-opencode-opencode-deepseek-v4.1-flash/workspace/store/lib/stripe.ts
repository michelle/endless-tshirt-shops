import Stripe from 'stripe';

let client: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  if (!client) {
    client = new Stripe(key, {
      // Let the SDK use its pinned API version for a stable response shape.
      typescript: true,
    });
  }
  return client;
}

export function getPublishableKey(): string {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
}
