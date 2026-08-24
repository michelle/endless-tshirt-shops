'use client';

import { loadStripe, type Stripe as StripeJs } from '@stripe/stripe-js';

/** Publishable key is inlined at build time; there is nothing secret in it. */
export const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

let promise: Promise<StripeJs | null> | undefined;

export function stripeJs(): Promise<StripeJs | null> {
  if (!promise) {
    promise = PUBLISHABLE_KEY ? loadStripe(PUBLISHABLE_KEY) : Promise.resolve(null);
  }
  return promise;
}

/** Elements appearance tuned to the original store's palette. */
export const APPEARANCE = {
  theme: 'stripe' as const,
  variables: {
    colorPrimary: '#337ab7',
    colorText: '#111213',
    colorDanger: '#eb1c26',
    borderRadius: '3px',
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    spacingUnit: '4px',
  },
};
