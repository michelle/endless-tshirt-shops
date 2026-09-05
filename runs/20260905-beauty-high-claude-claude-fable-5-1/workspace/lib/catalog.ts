/**
 * The catalog. One product (a moment), a few ways to wear it.
 * Prodigi SKUs verified against the sandbox catalog:
 *  - GLOBAL-TEE-BC-3001  Unisex Classic T-shirt, Bella + Canvas 3001
 *  - GLOBAL-TEE-BC-6004  Women's Favourite (fitted) T-shirt, Bella + Canvas 6004
 */

export const STYLES = ["unisex", "fitted"] as const;
export type Style = (typeof STYLES)[number];

export const COLORS = ["black", "white"] as const;
export type Color = (typeof COLORS)[number];

export const SIZES = ["S", "M", "L", "XL", "2XL"] as const;
export type Size = (typeof SIZES)[number];

export const STYLE_INFO: Record<
  Style,
  { label: string; blurb: string; sku: string; fabric: string }
> = {
  unisex: {
    label: "Unisex",
    blurb: "Classic cut, relaxed fit.",
    sku: "GLOBAL-TEE-BC-3001",
    fabric: "Bella + Canvas 3001 · 100% ring-spun cotton",
  },
  fitted: {
    label: "Fitted",
    blurb: "Slimmer through the body.",
    sku: "GLOBAL-TEE-BC-6004",
    fabric: "Bella + Canvas 6004 · 60/40 cotton-poly",
  },
};

export const COLOR_INFO: Record<Color, { label: string; ink: Color; hex: string }> = {
  black: { label: "Black", ink: "white", hex: "#101014" },
  white: { label: "White", ink: "black", hex: "#f4f1ea" },
};

/** Prices are in cents. The sale is permanent. Time is on sale. */
export const LIST_PRICE_CENTS = 3000;
export const PRICE_CENTS = 2250;
export const CURRENCY = "usd";

/**
 * Countries we ship to for free. This is the intersection of Prodigi
 * ship-to coverage for both SKUs and countries Stripe Checkout can
 * collect shipping addresses for.
 */
export const SHIP_TO_COUNTRIES = [
  "US", "CA", "GB", "IE", "AU", "NZ",
  "DE", "FR", "ES", "IT", "NL", "BE", "AT", "CH", "SE", "NO", "DK", "FI",
  "PT", "PL", "CZ", "HU", "GR", "RO",
  "JP", "SG", "HK", "KR", "MX", "BR",
] as const;

export function isStyle(v: unknown): v is Style {
  return typeof v === "string" && (STYLES as readonly string[]).includes(v);
}
export function isColor(v: unknown): v is Color {
  return typeof v === "string" && (COLORS as readonly string[]).includes(v);
}
export function isSize(v: unknown): v is Size {
  return typeof v === "string" && (SIZES as readonly string[]).includes(v);
}

/** Prodigi's size attribute values are lowercase: s, m, l, xl, 2xl */
export function prodigiSize(size: Size): string {
  return size.toLowerCase();
}

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}
