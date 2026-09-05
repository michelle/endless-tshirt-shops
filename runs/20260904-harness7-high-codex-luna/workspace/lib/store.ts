export type ShirtStyle = "fitted" | "unisex";
export type ShirtSize = "S" | "M" | "L" | "XL";

export const PRICE_CENTS = 2250;
export const PRODUCT_NAME = "datetime tee";

export function isShirtStyle(value: unknown): value is ShirtStyle {
  return value === "fitted" || value === "unisex";
}

export function isShirtSize(value: unknown): value is ShirtSize {
  return value === "S" || value === "M" || value === "L" || value === "XL";
}

export function safeTimestamp(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : Date.now();
}

export function prodigiSku(style: ShirtStyle) {
  return style === "fitted" ? "A-WT-GD64000L" : "A-MT-GD64000";
}

export function prodigiStyle(style: ShirtStyle) {
  return style === "fitted" ? "64000L" : "64000.0";
}

export function artworkUrl(origin: string, timestampMs: number) {
  return `${origin.replace(/\/$/, "")}/api/artwork?timestamp=${encodeURIComponent(String(timestampMs))}`;
}
