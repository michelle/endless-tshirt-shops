import Stripe from 'stripe';

let cached: Stripe | null = null;

export function stripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  cached = new Stripe(key, {
    // Pinned deliberately. The account-default (newest) version has renamed
    // `ui_mode: 'embedded'` to `'embedded_page'`; pinning keeps the request shape
    // in sync with the types shipped by this SDK version. Bump both together.
    apiVersion: '2025-08-27.basil',
    appInfo: { name: 'datetime.store', version: '1.0.0' },
    maxNetworkRetries: 2,
  });
  return cached;
}

export function isStripeTestMode(): boolean {
  // Sandbox keys from `stripe sandbox create` are `rkcs_test_…`, not `sk_test_…`.
  return /_test_/.test(process.env.STRIPE_SECRET_KEY ?? '');
}
