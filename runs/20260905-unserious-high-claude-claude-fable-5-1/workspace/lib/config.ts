/**
 * The entire product catalogue of datetime.store.
 * It is one shirt. It changes every millisecond.
 */

export const PRICE_CENTS = 2250;
export const LIST_PRICE_CENTS = 3000;
export const CURRENCY = "usd";

export const STYLES = ["fitted", "unisex"] as const;
export type ShirtStyle = (typeof STYLES)[number];

export const SIZES = ["S", "M", "L", "XL", "2XL"] as const;
export type ShirtSize = (typeof SIZES)[number];

export const STYLE_LABELS: Record<ShirtStyle, string> = {
  fitted: "Fitted",
  unisex: "Unisex",
};

/** Prodigi products. Both are black, 100% cotton, direct-to-garment. */
export const PRODIGI_PRODUCTS: Record<
  ShirtStyle,
  { sku: string; description: string }
> = {
  fitted: {
    sku: "GLOBAL-TEE-BC-6004",
    description: "Women's Favourite T-shirt, Bella + Canvas 6004",
  },
  unisex: {
    sku: "GLOBAL-TEE-GIL-64000",
    description: "Unisex Softstyle T-shirt, Gildan 64000",
  },
};

export const PRODIGI_COLOR = "black";

export const PRODIGI_SIZES: Record<ShirtSize, string> = {
  S: "s",
  M: "m",
  L: "l",
  XL: "xl",
  "2XL": "2xl",
};

/**
 * Countries we ship to (for free, which is a decision we may regret).
 * Every variant of both SKUs ships to all of these from at least one lab.
 */
export const ALLOWED_COUNTRIES = [
  "US", "CA", "GB", "IE", "AU", "NZ", "DE", "FR", "NL", "BE", "ES", "IT",
  "SE", "DK", "NO", "FI", "AT", "CH", "PT", "JP", "SG", "MX",
] as const;

/**
 * Prodigi's front print area for these tees: 15.6in x 19.3in at ~300dpi.
 * We render the artwork at the full print area so we control placement:
 * the number is ~8in wide, ~3in from the collar, matching the original.
 */
export const ARTWORK = {
  width: 4677,
  height: 5881,
  dpi: 300,
  textWidthInches: 8,
  topOffsetInches: 3,
  fontWeight: 500,
} as const;

/** How far a browser clock may drift from ours before we quietly use ours. */
export const CLOCK_TOLERANCE_MS = 5 * 60 * 1000;

export function isShirtStyle(v: unknown): v is ShirtStyle {
  return typeof v === "string" && (STYLES as readonly string[]).includes(v);
}
export function isShirtSize(v: unknown): v is ShirtSize {
  return typeof v === "string" && (SIZES as readonly string[]).includes(v);
}

export function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
