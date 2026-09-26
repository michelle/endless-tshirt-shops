/**
 * Pricing.
 *
 * Retail: $36 per tee. Shipping is a flat per-order rate (US $6,
 * international $14) — a simplification; see README for swapping in
 * Prodigi's quotes endpoint for cost-accurate, destination-specific rates.
 */

export const CURRENCY = 'usd';
export const SHIRT_UNIT_CENTS = 3600;
export const SHIPPING_US_CENTS = 600;
export const SHIPPING_INTL_CENTS = 1400;
export const MAX_QTY = 3;

export type Pricing = {
  unitCents: number;
  qty: number;
  itemsCents: number;
  shippingCents: number;
  totalCents: number;
  currency: string;
};

export function priceOrder(countryCode: string, qty: number): Pricing {
  const q = Math.min(MAX_QTY, Math.max(1, Math.floor(qty)));
  const itemsCents = SHIRT_UNIT_CENTS * q;
  const shippingCents = countryCode === 'US' ? SHIPPING_US_CENTS : SHIPPING_INTL_CENTS;
  return {
    unitCents: SHIRT_UNIT_CENTS,
    qty: q,
    itemsCents,
    shippingCents,
    totalCents: itemsCents + shippingCents,
    currency: CURRENCY,
  };
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Curated ship-to list (Prodigi ships globally; these are our launch markets). */
export const COUNTRIES: { code: string; name: string }[] = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'IE', name: 'Ireland' },
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'AT', name: 'Austria' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'PL', name: 'Poland' },
  { code: 'JP', name: 'Japan' },
  { code: 'SG', name: 'Singapore' },
];

export const COUNTRY_CODES = COUNTRIES.map((c) => c.code);

export function countryName(code: string): string {
  return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}
