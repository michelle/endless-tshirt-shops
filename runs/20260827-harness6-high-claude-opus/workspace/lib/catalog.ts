/**
 * The entire catalog: one t-shirt, printed with the exact millisecond you bought it.
 *
 * Landed cost from Prodigi (US, Budget shipping, black, size M) was $16.99 at the
 * time of writing, so $22.50 leaves roughly $5.50 of margin per shirt before
 * Stripe fees. See README for how to re-check that with the live quote endpoint.
 */

export const STYLES = ['fitted', 'unisex'] as const;
export const SIZES = ['S', 'M', 'L', 'XL'] as const;

export type Style = (typeof STYLES)[number];
export type Size = (typeof SIZES)[number];

export const LIST_PRICE_CENTS = 3000;
export const PRICE_CENTS = 2250;
export const CURRENCY = 'usd';

/** Countries we are willing to ship to. Prodigi prints globally; this is a business choice. */
export const SHIPPING_COUNTRIES = ['US'] as const;

export const PRODIGI_SHIPPING_METHOD = 'Budget';

type StyleSpec = {
  label: string;
  /** Prodigi SKU. Both are Gildan Softstyle, black. */
  sku: string;
  blurb: string;
};

export const STYLE_SPECS: Record<Style, StyleSpec> = {
  fitted: {
    label: 'Fitted',
    sku: 'GLOBAL-TEE-GIL-64000L',
    blurb: "Gildan 64000L · women's cut · 50/50 cotton-poly",
  },
  unisex: {
    label: 'Unisex',
    sku: 'GLOBAL-TEE-GIL-64000',
    blurb: 'Gildan 64000 · unisex cut · 100% cotton',
  },
};

/** Prodigi expects lowercase size attributes. */
export const PRODIGI_SIZES: Record<Size, string> = {
  S: 's',
  M: 'm',
  L: 'l',
  XL: 'xl',
};

export const PRODIGI_COLOR = 'black';

export function isStyle(value: unknown): value is Style {
  return typeof value === 'string' && (STYLES as readonly string[]).includes(value);
}

export function isSize(value: unknown): value is Size {
  return typeof value === 'string' && (SIZES as readonly string[]).includes(value);
}

/**
 * Timestamps are the product, so they get validated like one. We accept anything
 * from 2010 to ~40 years out: enough slack for clock skew without letting someone
 * mint a shirt that says `1`.
 */
const MIN_TS = 1_262_304_000_000; // 2010-01-01
const MAX_TS = 3_000_000_000_000; // 2065-01-24

export function parseTimestamp(value: unknown): number | null {
  const ts = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(ts) || ts < MIN_TS || ts > MAX_TS) return null;
  return ts;
}

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
