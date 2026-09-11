// Single SKU for the MVP: Gildan 64000 unisex softstyle tee, DTG front print.
export const PRODIGI_SKU = "GLOBAL-TEE-GIL-64000";

export const SIZES = ["s", "m", "l", "xl", "2xl"] as const;
export type Size = (typeof SIZES)[number];
export const SIZE_LABELS: Record<Size, string> = {
  s: "S",
  m: "M",
  l: "L",
  xl: "XL",
  "2xl": "2XL",
};

export const COLORS = ["black", "white", "navy blue"] as const;
export type ShirtColor = (typeof COLORS)[number];
export const COLOR_SWATCH: Record<ShirtColor, string> = {
  black: "#171717",
  white: "#f5f5f4",
  "navy blue": "#1b2540",
};

// Flat retail price in USD cents. Covers Prodigi's landed cost (item + standard
// US shipping, ~$16.90 in sandbox pricing for sizes S-2XL) plus payment
// processing and margin. US-only for v1 — see README for international gaps.
export const UNIT_PRICE_CENTS = 3600;

export const MAX_QUANTITY = 5;

export function isSize(v: string): v is Size {
  return (SIZES as readonly string[]).includes(v);
}
export function isColor(v: string): v is ShirtColor {
  return (COLORS as readonly string[]).includes(v);
}
