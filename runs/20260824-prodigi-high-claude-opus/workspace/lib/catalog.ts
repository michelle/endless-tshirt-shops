/**
 * The whole catalog: one product, in two cuts and four sizes.
 *
 * The thing that makes each unit unique is the timestamp printed on it, which
 * is captured at the moment the customer confirms payment.
 */

export const SHIRT_STYLES = ['fitted', 'unisex'] as const;
export const SHIRT_SIZES = ['S', 'M', 'L', 'XL'] as const;

export type ShirtStyle = (typeof SHIRT_STYLES)[number];
export type ShirtSize = (typeof SHIRT_SIZES)[number];

/** Retail price, in cents. */
export const PRICE_CENTS = 2250;
/** Shown struck through next to the price, like the original store did. */
export const LIST_PRICE_CENTS = 3000;
export const CURRENCY = 'usd';

/** Shipping is free to the customer; we absorb Prodigi's shipping cost. */
export const SHIPPING_CENTS = 0;

type StyleSpec = {
  label: string;
  /** Prodigi catalog SKU (size + color are Prodigi *attributes*, not part of the SKU). */
  sku: string;
  garment: string;
  color: string;
};

export const STYLES: Record<ShirtStyle, StyleSpec> = {
  fitted: {
    label: 'Fitted',
    sku: 'GLOBAL-TEE-BC-6004',
    garment: "Bella + Canvas 6004 — Women's Favourite Tee",
    color: 'black',
  },
  unisex: {
    label: 'Unisex',
    sku: 'GLOBAL-TEE-GIL-64000',
    garment: 'Gildan 64000 — Unisex Softstyle Tee',
    color: 'black',
  },
};

/** Prodigi expects lowercase size attributes. */
export const PRODIGI_SIZES: Record<ShirtSize, string> = {
  S: 's',
  M: 'm',
  L: 'l',
  XL: 'xl',
};

export function isShirtStyle(value: unknown): value is ShirtStyle {
  return typeof value === 'string' && (SHIRT_STYLES as readonly string[]).includes(value);
}

export function isShirtSize(value: unknown): value is ShirtSize {
  return typeof value === 'string' && (SHIRT_SIZES as readonly string[]).includes(value);
}

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Countries Prodigi can deliver both tees to, and that Stripe can collect an
 * address for. Kept deliberately short so we never take an order we cannot
 * fulfill.
 */
export const SHIPPING_COUNTRIES = [
  'US',
  'CA',
  'GB',
  'IE',
  'AU',
  'NZ',
  'DE',
  'FR',
  'ES',
  'IT',
  'NL',
  'BE',
  'AT',
  'CH',
  'SE',
  'NO',
  'DK',
  'FI',
  'PT',
  'PL',
  'JP',
] as const;
