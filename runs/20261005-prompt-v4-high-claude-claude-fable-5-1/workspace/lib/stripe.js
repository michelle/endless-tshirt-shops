import Stripe from 'stripe';

let client = null;
export function stripe() {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
    client = new Stripe(key, { apiVersion: '2024-12-18.acacia', appInfo: { name: 'Dayprint', version: '1.0.0' } });
  }
  return client;
}

export const PRICE_CENTS = () => Number(process.env.PRICE_CENTS || 3600);
export const SHIPPING_CENTS = () => Number(process.env.SHIPPING_CENTS || 795);
export const CURRENCY = 'usd';

// Countries we let customers ship to. All are served by Prodigi's global tee network.
export const SHIP_COUNTRIES = ['US', 'CA', 'GB', 'IE', 'AU', 'NZ', 'DE', 'FR', 'NL', 'BE', 'LU', 'ES', 'PT', 'IT', 'AT', 'CH', 'SE', 'NO', 'DK', 'FI', 'PL', 'CZ', 'HU', 'RO', 'GR', 'JP', 'SG', 'HK', 'KR', 'MX', 'BR', 'ZA', 'AE', 'IL', 'IN'];
