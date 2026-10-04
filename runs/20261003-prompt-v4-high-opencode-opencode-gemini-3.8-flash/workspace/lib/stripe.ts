import Stripe from 'stripe';

const STRIPE_SECRET_KEY =
  process.env.STRIPE_SECRET_KEY ||
  'REDACTED_BUILD_PLACEHOLDER';

export const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20' as any
});

export const STRIPE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  'REDACTED_BUILD_PLACEHOLDER';
