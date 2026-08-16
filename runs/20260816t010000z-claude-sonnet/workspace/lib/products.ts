export type ShirtStyle = "fitted" | "unisex";
export type ShirtSize = "S" | "M" | "L" | "XL";

export const PRICE_CENTS = 2250;
export const LIST_PRICE_CENTS = 3000;

export const STYLE_LABELS: Record<ShirtStyle, string> = {
  fitted: "Fitted",
  unisex: "Unisex",
};

// Scalable Press catalog product ids (DTG print).
export const SP_PRODUCTS: Record<ShirtStyle, string> = {
  fitted: "bella-ladies-favorite-t-shirt",
  unisex: "next-level-fitted-crew",
};

export const SP_COLOR = "Black";

export const SP_SIZES: Record<ShirtSize, string> = {
  S: "sml",
  M: "med",
  L: "lrg",
  XL: "xlg",
};

export const SIZES: ShirtSize[] = ["S", "M", "L", "XL"];
export const STYLES: ShirtStyle[] = ["fitted", "unisex"];

export function isShirtStyle(value: unknown): value is ShirtStyle {
  return value === "fitted" || value === "unisex";
}

export function isShirtSize(value: unknown): value is ShirtSize {
  return value === "S" || value === "M" || value === "L" || value === "XL";
}
