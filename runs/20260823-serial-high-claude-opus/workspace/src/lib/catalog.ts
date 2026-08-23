/**
 * The catalog is deliberately tiny: we sell exactly one thing, a t-shirt with a
 * timestamp on it. Everything that a human might want to change about the
 * product (blanks, colours, sizes, price) lives here.
 */

export const SHIRT_STYLES = ['fitted', 'unisex'] as const;
export type ShirtStyle = (typeof SHIRT_STYLES)[number];

export const SHIRT_SIZES = ['S', 'M', 'L', 'XL'] as const;
export type ShirtSize = (typeof SHIRT_SIZES)[number];

/**
 * Scalable Press product ids for the blanks we print on.
 *
 * Both of these were verified end-to-end against the live API: DTG-capable,
 * Black in stock in every size we sell, and — importantly — they return a
 * priced quote *with a shipping address*. That last part is not a given. A lot
 * of otherwise-valid catalog entries (`next-level-boyfriend-tee`,
 * `next-level-ladies-ideal-t-shirt`, `bella-ladies-favorite-t-shirt`, …) quote
 * fine with no address and then fail with a bare HTTP 500 the moment one is
 * supplied, so any substitution here needs re-verifying with a real address.
 * `scripts/verify-products.mjs` does exactly that.
 */
export const SP_PRODUCTS: Record<ShirtStyle, { id: string; color: string; label: string }> = {
  fitted: {
    id: 'next-level-fitted-crew',
    color: 'Black',
    label: 'Next Level Fitted Crew',
  },
  unisex: {
    id: 'gildan-ultra-cotton-t-shirt',
    color: 'Black',
    label: 'Gildan Ultra Cotton',
  },
};

/** Our size labels -> Scalable Press size codes. */
export const SP_SIZES: Record<ShirtSize, string> = {
  S: 'sml',
  M: 'med',
  L: 'lrg',
  XL: 'xlg',
};

export const STYLE_LABELS: Record<ShirtStyle, string> = {
  fitted: 'Fitted',
  unisex: 'Unisex',
};

/**
 * Everything in cents, USD.
 *
 * Margin check at the time of writing: Scalable Press quotes $15.09 all-in for
 * the fitted crew and $14.21 for the Gildan (blank + DTG + $5 shipping + tax),
 * and Stripe takes roughly $0.95 on a $22.50 card charge. So we clear about
 * $6.45 on the worst case. Thin but real — raise `amount` before raising volume.
 */
export const PRICING = {
  currency: 'usd',
  /** What we actually charge. */
  amount: 2250,
  /** The struck-through "list" price, purely cosmetic — same as the original. */
  compareAtAmount: 3000,
  /** Free shipping to the customer; we absorb the printer's $5. */
  shippingAmount: 0,
} as const;

export const PRINT = {
  /** Print width on the garment, in inches. */
  widthInches: 8,
  /** Distance from the collar seam to the top of the print, in inches. */
  topOffsetInches: 3,
  /** Target print resolution. 300dpi is what Scalable Press asks for DTG. */
  dpi: 300,
} as const;

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function isShirtStyle(value: unknown): value is ShirtStyle {
  return typeof value === 'string' && (SHIRT_STYLES as readonly string[]).includes(value);
}

export function isShirtSize(value: unknown): value is ShirtSize {
  return typeof value === 'string' && (SHIRT_SIZES as readonly string[]).includes(value);
}
