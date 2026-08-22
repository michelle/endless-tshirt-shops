export type ShirtStyle = "fitted" | "unisex";
export type ShirtSize = "S" | "M" | "L" | "XL";

export const PRICE_CENTS = 2250;
export const LIST_PRICE_CENTS = 3000;

// Scalable Press product SKUs, verified against the live test catalog.
export const SP_PRODUCTS: Record<ShirtStyle, string> = {
  fitted: "next-level-fitted-crew",
  unisex: "canvas-unisex-t-shirt",
};

export const SP_COLOR = "Black";

export const SP_SIZES: Record<ShirtSize, string> = {
  S: "sml",
  M: "med",
  L: "lrg",
  XL: "xlg",
};

export const STYLE_LABELS: Record<ShirtStyle, string> = {
  fitted: "Fitted",
  unisex: "Unisex",
};

export function isShirtStyle(v: unknown): v is ShirtStyle {
  return v === "fitted" || v === "unisex";
}

export function isShirtSize(v: unknown): v is ShirtSize {
  return v === "S" || v === "M" || v === "L" || v === "XL";
}
