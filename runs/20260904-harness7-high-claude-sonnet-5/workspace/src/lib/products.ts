// Shared product catalog. Safe to import from both client and server code —
// no secrets live here.

export type StyleId = "fitted" | "unisex";
export type SizeId = "S" | "M" | "L" | "XL";

export const STYLES: Record<
  StyleId,
  { label: string; description: string; prodigiSku: string }
> = {
  fitted: {
    label: "Fitted",
    description: "Bella + Canvas Women's Favourite tee",
    prodigiSku: "GLOBAL-TEE-BC-6004",
  },
  unisex: {
    label: "Unisex",
    description: "Gildan Softstyle unisex tee",
    prodigiSku: "GLOBAL-TEE-GIL-64000",
  },
};

export const SIZES: Record<SizeId, { label: string; prodigiSize: string }> = {
  S: { label: "S", prodigiSize: "s" },
  M: { label: "M", prodigiSize: "m" },
  L: { label: "L", prodigiSize: "l" },
  XL: { label: "XL", prodigiSize: "xl" },
};

export const SHIRT_COLOR = "black";
export const PRODIGI_COLOR = "black";

export const PRICE_CENTS = 2250;
export const COMPARE_AT_CENTS = 3000;
export const CURRENCY = "usd";

export const SHIPPING_COUNTRIES = [
  "US",
  "CA",
  "GB",
  "AU",
  "IE",
  "DE",
  "FR",
  "NL",
  "ES",
  "IT",
] as const;

export function isStyleId(value: unknown): value is StyleId {
  return value === "fitted" || value === "unisex";
}

export function isSizeId(value: unknown): value is SizeId {
  return value === "S" || value === "M" || value === "L" || value === "XL";
}

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
