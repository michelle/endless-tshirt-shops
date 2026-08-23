'use client';

import { loadStripe, type Stripe, type StripeElementsOptions } from '@stripe/stripe-js';

import { PRICING } from './catalog';

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      console.error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is missing');
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}

/** Elements is created before the PaymentIntent exists (deferred intent flow). */
export const elementsOptions: StripeElementsOptions = {
  mode: 'payment',
  amount: PRICING.amount,
  currency: PRICING.currency,
  captureMethod: 'automatic',
  paymentMethodTypes: undefined,
  appearance: {
    theme: 'stripe',
    variables: {
      colorPrimary: '#337ab7',
      colorBackground: '#ffffff',
      colorText: '#0a0a0a',
      colorDanger: '#d0342c',
      fontFamily: '"Helvetica Neue", Helvetica, -apple-system, sans-serif',
      fontSizeBase: '15px',
      borderRadius: '10px',
      spacingUnit: '4px',
    },
    rules: {
      '.Input': {
        border: '1px solid #e6e8eb',
        boxShadow: 'none',
        padding: '10px 12px',
      },
      '.Input:focus': {
        border: '1px solid #337ab7',
        boxShadow: '0 0 0 3px rgba(51, 122, 183, 0.15)',
      },
      '.Label': {
        fontWeight: '500',
        color: '#6b7280',
      },
    },
  },
};
