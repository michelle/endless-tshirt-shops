export type ShirtStyle = "unisex" | "fitted";
export type ShirtSize = "S" | "M" | "L" | "XL";
export type ShirtColor = "white" | "black";

export const PRICE_USD_CENTS = 2250;
export const COMPARE_AT_USD_CENTS = 3000;
export const CURRENCY = "usd";

export const SIZES: ShirtSize[] = ["S", "M", "L", "XL"];

export const STYLE_LABELS: Record<ShirtStyle, string> = {
  unisex: "Unisex",
  fitted: "Fitted",
};

export const COLOR_LABELS: Record<ShirtColor, string> = {
  white: "White",
  black: "Black",
};

// Prodigi (sandbox + live) product SKUs — Gildan 64000 Softstyle tee family.
export const PRODIGI_SKU: Record<ShirtStyle, string> = {
  unisex: "GLOBAL-TEE-GIL-64000",
  fitted: "GLOBAL-TEE-GIL-64000L",
};

export function prodigiSize(size: ShirtSize): string {
  return size.toLowerCase();
}

export const ALLOWED_SHIP_COUNTRIES = [
  "US",
  "CA",
  "GB",
  "AU",
  "NZ",
  "IE",
  "DE",
  "FR",
  "NL",
  "ES",
  "IT",
  "SE",
  "JP",
] as const;

export function isShirtStyle(v: unknown): v is ShirtStyle {
  return v === "unisex" || v === "fitted";
}

export function isShirtSize(v: unknown): v is ShirtSize {
  return v === "S" || v === "M" || v === "L" || v === "XL";
}

export function isShirtColor(v: unknown): v is ShirtColor {
  return v === "white" || v === "black";
}

export function productName(style: ShirtStyle, size: ShirtSize, color: ShirtColor): string {
  return `datetime.store tee — ${STYLE_LABELS[style]} / ${size} / ${COLOR_LABELS[color]}`;
}
