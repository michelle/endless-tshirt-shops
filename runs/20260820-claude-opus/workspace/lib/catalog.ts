/**
 * Product catalog. Mirrors the original datetime.store: two blank styles,
 * printed black, four sizes, one flat price.
 */

export const STYLES = ['fitted', 'unisex'] as const;
export const SIZES = ['S', 'M', 'L', 'XL'] as const;

export type Style = (typeof STYLES)[number];
export type Size = (typeof SIZES)[number];

/** Scalable Press product IDs, carried over from the original store. */
export const SP_PRODUCT_ID: Record<Style, string> = {
  fitted: 'bella-ladies-favorite-t-shirt',
  unisex: 'next-level-fitted-crew',
};

export const STYLE_LABEL: Record<Style, string> = {
  fitted: 'Fitted',
  unisex: 'Unisex',
};

/** Scalable Press size codes. */
export const SP_SIZE_CODE: Record<Size, string> = {
  S: 'sml',
  M: 'med',
  L: 'lrg',
  XL: 'xlg',
};

/** Every shirt is printed on black; the datetime prints in white. */
export const SP_COLOR = 'Black';

/** Direct-to-garment printing. */
export const SP_PRINT_TYPE = 'dtg';

/** Price in cents. The original listed $30.00 and sold at $22.50. */
export const PRICE_CENTS = 2250;
export const LIST_PRICE_CENTS = 3000;
export const CURRENCY = 'usd';

export function isStyle(value: unknown): value is Style {
  return typeof value === 'string' && (STYLES as readonly string[]).includes(value);
}

export function isSize(value: unknown): value is Size {
  return typeof value === 'string' && (SIZES as readonly string[]).includes(value);
}

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
