export type ShirtStyle = "fitted" | "unisex";
export type ShirtSize = "S" | "M" | "L" | "XL";

// Scalable Press product IDs. `next-level-boyfriend-tee` and every other
// product in the "Ladies" catalog family returns a 500 from the /v2/quote
// endpoint on this test key, so "fitted" is mapped to a v-neck cut instead
// of a literal women's-fit garment. Both were confirmed against the live
// Scalable Press test API before shipping.
export const SP_PRODUCTS: Record<ShirtStyle, string> = {
  fitted: "canvas-v-neck-t-shirt",
  unisex: "canvas-unisex-t-shirt",
};

export const SP_SIZES: Record<ShirtSize, string> = {
  S: "sml",
  M: "med",
  L: "lrg",
  XL: "xlg",
};

export const GARMENT_COLOR = "Black";

export const PRICE_CENTS = 2250;
export const ORIGINAL_PRICE_CENTS = 3000;
export const CURRENCY = "usd";

export const SHIRT_STYLE_LABELS: Record<ShirtStyle, string> = {
  fitted: "Fitted",
  unisex: "Unisex",
};
