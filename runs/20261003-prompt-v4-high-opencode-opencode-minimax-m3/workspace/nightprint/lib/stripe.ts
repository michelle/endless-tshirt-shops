/**
 * Stripe client with a "demo" fallback.
 *
 * Production path:
 *   - Set STRIPE_SECRET_KEY (sk_test_... for testing or sk_live_... for production)
 *   - The CHECKOUT and WEBHOOK routes will then call into Stripe.
 *
 * Demo path (no STRIPE_SECRET_KEY set):
 *   - We expose a /api/demo-pay route that simulates a successful payment.
 *   - This lets the full order pipeline run end-to-end with no Stripe account.
 *   - The UI clearly labels the demo flow so it's not confused with production.
 */
import Stripe from 'stripe';

let cachedClient: Stripe | null | undefined;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe(): Stripe | null {
  if (cachedClient !== undefined) return cachedClient;
  if (!process.env.STRIPE_SECRET_KEY) {
    cachedClient = null;
    return null;
  }
  cachedClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-02-24.acacia',
  });
  return cachedClient;
}

export function stripeMode(): 'live' | 'test' | 'demo' {
  const k = process.env.STRIPE_SECRET_KEY;
  if (!k) return 'demo';
  if (k.startsWith('sk_live_')) return 'live';
  return 'test';
}
