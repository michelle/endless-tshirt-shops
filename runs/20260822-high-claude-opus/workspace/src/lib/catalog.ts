/**
 * Product catalog.
 *
 * We sell exactly one thing: a t-shirt printed with the epoch millisecond at
 * which it was bought. The only choices are cut and size.
 */

export const LIST_PRICE_CENTS = 3000;
export const PRICE_CENTS = 2250;
export const CURRENCY = 'usd';
export const COUNTRY = 'US';

/** Print colour is always black — white ink on black is the whole look. */
export const GARMENT_COLOR = 'Black';

export type ShirtStyle = 'fitted' | 'unisex';
export type ShirtSize = 'S' | 'M' | 'L' | 'XL';

export const SHIRT_STYLES = ['fitted', 'unisex'] as const;
export const SHIRT_SIZES = ['S', 'M', 'L', 'XL'] as const;

/**
 * Scalable Press product ids. The original store used
 * `next-level-boyfriend-tee` for the fitted cut, but that product no longer
 * returns a DTG quote from Scalable Press, so the fitted cut maps to the
 * closest ladies' equivalent that does.
 */
export const SP_PRODUCTS: Record<ShirtStyle, string> = {
  fitted: 'gildan-ladies-missy-t-shirt',
  unisex: 'next-level-fitted-crew',
};

export const STYLE_LABELS: Record<ShirtStyle, string> = {
  fitted: 'Fitted',
  unisex: 'Unisex',
};

export const STYLE_BLURBS: Record<ShirtStyle, string> = {
  fitted: 'Gildan Ladies Missy — 100% cotton, tapered cut.',
  unisex: 'Next Level Fitted Crew — 4.3 oz combed cotton, soft hand.',
};

/** Scalable Press size codes. */
export const SP_SIZES: Record<ShirtSize, string> = {
  S: 'sml',
  M: 'med',
  L: 'lrg',
  XL: 'xlg',
};

export function isShirtStyle(v: unknown): v is ShirtStyle {
  return v === 'fitted' || v === 'unisex';
}

export function isShirtSize(v: unknown): v is ShirtSize {
  return v === 'S' || v === 'M' || v === 'L' || v === 'XL';
}

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
