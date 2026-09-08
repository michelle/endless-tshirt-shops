// Product & fulfillment configuration. Kept in one place since these
// values have to agree across the checkout line item, the Stripe
// metadata, and the Prodigi order payload.

export const PRODIGI_SKU = 'GLOBAL-TEE-GIL-64000'; // Gildan 64000 unisex tee, verified against sandbox catalog

export const PRICE_USD_CENTS = 3800; // flat price per shirt, all sizes/colors

export const SHIRT_COLORS = [
  { key: 'white', label: 'White', hex: '#f5f5f2' },
  { key: 'black', label: 'Black', hex: '#161616' },
  { key: 'navy blue', label: 'Navy', hex: '#1b2a4a' },
  { key: 'sport grey', label: 'Sport Grey', hex: '#9a9a9a' },
  { key: 'forest green', label: 'Forest Green', hex: '#2d4a34' },
  { key: 'maroon', label: 'Maroon', hex: '#5e1f2e' },
] as const;

export type ShirtColorKey = (typeof SHIRT_COLORS)[number]['key'];

export function getShirtColor(key: string) {
  return SHIRT_COLORS.find((c) => c.key === key) ?? SHIRT_COLORS[0];
}

export const SHIRT_SIZES = ['s', 'm', 'l', 'xl', '2xl', '3xl'] as const;
export type ShirtSize = (typeof SHIRT_SIZES)[number];

export const MAX_QUANTITY = 5;
export const MAX_SEED_LENGTH = 60;

// Countries we've sanity-checked ship cleanly from Prodigi's global routing
// and that we're comfortable collecting addresses for. Prodigi ships much
// more broadly than this - see the launch notes for how to widen this list.
export const ALLOWED_SHIP_COUNTRIES = [
  'US', 'CA', 'GB', 'AU', 'IE', 'DE', 'FR', 'ES', 'IT', 'NL', 'NZ', 'SE',
] as const;
