/**
 * Product catalog. Shared by the client (pickers) and the server (Scalable Press
 * payloads), so the two can never drift apart.
 */

export const PRICE_CENTS = 2250;
export const COMPARE_AT_CENTS = 3000;
export const CURRENCY = 'usd';

/** Scalable Press product ids, keyed by the style the customer picks. */
export const STYLES = {
  fitted: {
    label: 'Fitted',
    productId: 'bella-ladies-favorite-t-shirt',
    color: 'Black',
  },
  unisex: {
    label: 'Unisex',
    productId: 'next-level-fitted-crew',
    color: 'Black',
  },
} as const;

export type Style = keyof typeof STYLES;

/** Display size -> Scalable Press size code. Every code below is stocked in
 *  Black for both products above. */
export const SIZES = {
  S: 'sml',
  M: 'med',
  L: 'lrg',
  XL: 'xlg',
  XXL: 'xxl',
} as const;

export type Size = keyof typeof SIZES;

export const STYLE_KEYS = Object.keys(STYLES) as Style[];
export const SIZE_KEYS = Object.keys(SIZES) as Size[];

/** Print geometry, in inches, on the front of the shirt. */
export const PRINT = {
  widthInches: 8,
  offsetTopInches: 3,
  horizontal: 'C',
  /** Artwork is rasterized at this DPI so the print is sharp. */
  dpi: 300,
} as const;

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function isStyle(v: unknown): v is Style {
  return typeof v === 'string' && v in STYLES;
}

export function isSize(v: unknown): v is Size {
  return typeof v === 'string' && v in SIZES;
}
