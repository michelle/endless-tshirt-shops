import Stripe from 'stripe';

let cached: Stripe | null = null;

export function stripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  // No apiVersion override: the SDK pins the version it was built against,
  // which is what its types describe.
  cached = new Stripe(key, {
    appInfo: { name: 'datetime.store', version: '1.0.0' },
  });
  return cached;
}
