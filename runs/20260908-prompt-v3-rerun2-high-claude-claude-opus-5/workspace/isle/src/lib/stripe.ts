import Stripe from 'stripe';

let cached: Stripe | null = null;

/** Lazily constructed so a missing key fails on the request, not at build time. */
export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_t, prop) {
    if (!cached) {
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
      cached = new Stripe(key, { appInfo: { name: 'isle-of-you' } });
    }
    return (cached as any)[prop];
  },
});
