import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  _stripe = new Stripe(key, {
    // Pin only when needed; otherwise use whatever the SDK default is.
    apiVersion: '2025-02-24.acacia' as any,
    appInfo: { name: 'here-coords-tees', version: '0.1.0' },
    maxNetworkRetries: 2,
  });
  return _stripe;
}
