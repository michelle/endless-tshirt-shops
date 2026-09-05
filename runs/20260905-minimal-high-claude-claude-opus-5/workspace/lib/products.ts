/**
 * Catalogue + pricing.
 *
 * The original datetime.store sold one product — a black tee printed with the
 * exact millisecond you bought it — in two cuts and four sizes, for $22.50
 * (marked down from $30.00) with free shipping. We keep that exactly, and swap
 * the Scalable Press blanks for their Prodigi equivalents.
 */

export const PRICE_CENTS = 2250;
export const LIST_PRICE_CENTS = 3000;
export const CURRENCY = 'usd';

export const SHIRT_STYLES = ['fitted', 'unisex'] as const;
export type ShirtStyle = (typeof SHIRT_STYLES)[number];

export const SHIRT_SIZES = ['S', 'M', 'L', 'XL'] as const;
export type ShirtSize = (typeof SHIRT_SIZES)[number];

type StyleSpec = {
  label: string;
  /** Prodigi catalogue SKU. */
  sku: string;
  blank: string;
  /** Prodigi `attributes.color` value. */
  color: string;
};

export const STYLE_SPECS: Record<ShirtStyle, StyleSpec> = {
  // Scalable Press `bella-ladies-favorite-t-shirt` -> Prodigi Bella + Canvas 6004.
  fitted: {
    label: 'Fitted',
    sku: 'GLOBAL-TEE-BC-6004',
    blank: "Bella + Canvas 6004 Women's Favourite T-shirt",
    color: 'black',
  },
  // Scalable Press `next-level-fitted-crew` -> Prodigi Bella + Canvas 3001.
  unisex: {
    label: 'Unisex',
    sku: 'GLOBAL-TEE-BC-3001',
    blank: 'Bella + Canvas 3001 Unisex Classic T-shirt',
    color: 'black',
  },
};

/** Prodigi expects lowercase size attributes. */
export function prodigiSize(size: ShirtSize): string {
  return size.toLowerCase();
}

export function isShirtStyle(v: unknown): v is ShirtStyle {
  return typeof v === 'string' && (SHIRT_STYLES as readonly string[]).includes(v);
}

export function isShirtSize(v: unknown): v is ShirtSize {
  return typeof v === 'string' && (SHIRT_SIZES as readonly string[]).includes(v);
}

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
