/**
 * The catalog. There is exactly one product — a black t-shirt with a Unix
 * millisecond timestamp printed on the chest — in two cuts and seven sizes.
 *
 * Product IDs are Scalable Press product identifiers. The original store used
 * `next-level-boyfriend-tee` / `next-level-fitted-crew`, but the boyfriend tee
 * no longer returns a quote from Scalable Press (their pricing service 500s on
 * it), so `fitted` moved to the Next Level Fitted Crew and `unisex` to the
 * Bella+Canvas unisex tee. Both are stocked deep in black at the DTG facility.
 */

export const SHIRT_STYLES = ['fitted', 'unisex'] as const;
export type ShirtStyle = (typeof SHIRT_STYLES)[number];

export const SHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'] as const;
export type ShirtSize = (typeof SHIRT_SIZES)[number];

/** Scalable Press size codes, keyed by the size we show customers. */
export const SP_SIZE_CODES: Record<ShirtSize, string> = {
  XS: 'xsml',
  S: 'sml',
  M: 'med',
  L: 'lrg',
  XL: 'xlg',
  '2XL': 'xxl',
  '3XL': 'xxxl',
};

export type StyleSpec = {
  /** Scalable Press product ID. */
  productId: string;
  /** Scalable Press colour name. Must match the product's colour list exactly. */
  color: string;
  label: string;
  blurb: string;
};

export const STYLE_SPECS: Record<ShirtStyle, StyleSpec> = {
  fitted: {
    productId: 'next-level-fitted-crew',
    color: 'Black',
    label: 'Fitted',
    blurb: 'Next Level Fitted Crew · 4.3oz combed cotton',
  },
  unisex: {
    productId: 'canvas-unisex-t-shirt',
    color: 'Black',
    label: 'Unisex',
    blurb: 'Bella+Canvas Unisex Tee · 4.2oz combed cotton',
  },
};

/** Retail price, in cents. Server-authoritative — never trust a client amount. */
export const PRICE_CENTS = 2250;
/** The "was" price we strike through, in cents. */
export const LIST_PRICE_CENTS = 3000;
export const CURRENCY = 'usd';

/** Direct-to-garment print geometry, in inches. */
export const PRINT = {
  /** Artwork width on the garment. */
  widthInches: 8,
  /** Distance from the collar seam to the top of the artwork. */
  topOffsetInches: 3,
  /** Print resolution we render artwork at. */
  dpi: 300,
} as const;

export const PRINT_WIDTH_PX = PRINT.widthInches * PRINT.dpi;

export function isShirtStyle(value: unknown): value is ShirtStyle {
  return typeof value === 'string' && (SHIRT_STYLES as readonly string[]).includes(value);
}

export function isShirtSize(value: unknown): value is ShirtSize {
  return typeof value === 'string' && (SHIRT_SIZES as readonly string[]).includes(value);
}

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
