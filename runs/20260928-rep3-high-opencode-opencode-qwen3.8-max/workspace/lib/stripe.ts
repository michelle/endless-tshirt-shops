import Stripe from 'stripe';

let cached: Stripe | null = null;

export function stripe(): Stripe {
  if (!cached) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
    cached = new Stripe(key);
  }
  return cached;
}

export function appUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

/** Countries we ship to: Prodigi BC3001 lab coverage ∩ Stripe Checkout support. */
export const SHIPPING_COUNTRIES: Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[] = [
  'US', 'CA', 'GB', 'IE', 'AU', 'NZ', 'DE', 'FR', 'ES', 'IT', 'NL', 'BE',
  'LU', 'AT', 'PT', 'SE', 'NO', 'DK', 'FI', 'PL', 'CZ', 'CH', 'GR', 'HU',
  'RO', 'SI', 'SK', 'EE', 'LV', 'LT', 'HR', 'JP', 'SG',
];
