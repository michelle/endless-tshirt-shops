/**
 * Product catalog. One product (a black tee printed with the current datetime),
 * two cuts, four sizes. Fulfilled by Prodigi.
 */

export const STYLES = ["fitted", "unisex"] as const;
export type Style = (typeof STYLES)[number];

export const SIZES = ["S", "M", "L", "XL"] as const;
export type Size = (typeof SIZES)[number];

export const PRICE_CENTS = 2250; // what the customer pays
export const COMPARE_AT_CENTS = 3000; // struck-through "was" price
export const CURRENCY = "usd";

/** Countries we ship to. Prodigi ships globally, but our price includes free shipping, so we keep it to the US like the original store. */
export const SHIPPING_COUNTRIES = ["US"] as const;

export const SHIRT_COLOR = "black";

export interface StyleInfo {
  label: string;
  description: string;
  /** Prodigi SKU */
  sku: string;
}

export const STYLE_INFO: Record<Style, StyleInfo> = {
  fitted: {
    label: "Fitted",
    description: "Bella + Canvas 6004 women's favourite tee",
    sku: "GLOBAL-TEE-BC-6004",
  },
  unisex: {
    label: "Unisex",
    description: "Bella + Canvas 3001 unisex classic tee",
    sku: "GLOBAL-TEE-BC-3001",
  },
};

/** Prodigi size attribute values (lower-case). */
export const PRODIGI_SIZE: Record<Size, string> = {
  S: "s",
  M: "m",
  L: "l",
  XL: "xl",
};

export function isStyle(value: unknown): value is Style {
  return typeof value === "string" && (STYLES as readonly string[]).includes(value);
}

export function isSize(value: unknown): value is Size {
  return typeof value === "string" && (SIZES as readonly string[]).includes(value);
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
