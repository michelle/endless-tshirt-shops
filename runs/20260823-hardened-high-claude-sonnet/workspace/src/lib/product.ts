export type ShirtStyle = "fitted" | "unisex";
export type ShirtSize = "S" | "M" | "L" | "XL";

export const CURRENCY = "usd";
export const PRICE_CENTS = 2250; // $22.50
export const COMPARE_AT_CENTS = 3000; // $30.00 (struck through)

export const STYLES: Record<
  ShirtStyle,
  { label: string; scalablePressProductId: string }
> = {
  fitted: { label: "Fitted", scalablePressProductId: "next-level-fitted-crew" },
  unisex: { label: "Unisex", scalablePressProductId: "gildan-ultra-cotton-t-shirt" },
};

export const SIZES: ShirtSize[] = ["S", "M", "L", "XL"];

export const SIZE_TO_SCALABLE_PRESS: Record<ShirtSize, string> = {
  S: "sml",
  M: "med",
  L: "lrg",
  XL: "xlg",
};

export const GARMENT_COLOR = "White";

export function isShirtStyle(value: unknown): value is ShirtStyle {
  return value === "fitted" || value === "unisex";
}

export function isShirtSize(value: unknown): value is ShirtSize {
  return typeof value === "string" && (SIZES as string[]).includes(value);
}

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
