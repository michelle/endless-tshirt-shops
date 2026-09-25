// Payments configuration. Stripe is the production provider; a clearly-labeled
// sandbox checkout stands in when Stripe keys are not configured (demo only).

export function paymentMode() {
  const hasStripe =
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_WEBHOOK_SECRET &&
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (hasStripe) return 'stripe';
  if (process.env.ENABLE_SANDBOX_CHECKOUT === 'true') return 'sandbox';
  return 'none';
}

export function stripeClient() {
  const Stripe = require('stripe');
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });
}
