'use client';

import { loadStripe, type Appearance, type Stripe } from '@stripe/stripe-js';

let cached: Promise<Stripe | null> | null = null;

/** Stripe.js is loaded once per page, lazily, and memoised. */
export function getStripe(publishableKey: string): Promise<Stripe | null> | null {
  if (!publishableKey) return null;
  if (!cached) cached = loadStripe(publishableKey);
  return cached;
}

/** Square corners, the store's blue, and the store's typeface. */
export const STRIPE_APPEARANCE: Appearance = {
  theme: 'stripe',
  variables: {
    colorPrimary: '#337ab7',
    colorText: '#111111',
    colorDanger: '#eb1c26',
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    fontSizeBase: '16px',
    borderRadius: '0px',
    spacingUnit: '4px',
  },
  rules: {
    '.Input': {
      border: '0',
      borderBottom: '1px solid #a4d5ff',
      boxShadow: 'none',
      padding: '6px 0',
    },
    '.Input:focus': {
      borderBottomColor: '#337ab7',
      boxShadow: 'none',
    },
    '.Label': {
      fontSize: '13px',
      color: '#8a8a8a',
    },
    '.Tab': { borderRadius: '0px' },
  },
};
