// Shared product constants for the single SKU this store sells: a t-shirt
// printed with the exact millisecond timestamp at the moment of purchase.

export type ShirtStyle = "fitted" | "unisex";
export type ShirtSize = "S" | "M" | "L" | "XL";

export const SHIRT_STYLES: { value: ShirtStyle; label: string }[] = [
  { value: "fitted", label: "Fitted" },
  { value: "unisex", label: "Unisex" },
];

export const SHIRT_SIZES: ShirtSize[] = ["S", "M", "L", "XL"];

export const PRICE_CENTS = 2250; // $22.50, matches the original store.
export const CURRENCY = "usd";

// Prodigi (print-on-demand) product SKUs. Both are Gildan 64000-series
// softstyle tees in black, printed via Prodigi's sandbox catalogue.
export const PRODIGI_SKU: Record<ShirtStyle, string> = {
  unisex: "GLOBAL-TEE-GIL-64000", // Unisex Softstyle Tee, Gildan 64000
  fitted: "GLOBAL-TEE-GIL-64000L", // Women's fitted Softstyle Tee, Gildan 64000L
};

export const PRODIGI_COLOR = "black";

export function prodigiSize(size: ShirtSize): string {
  return size.toLowerCase();
}

export function isShirtStyle(value: unknown): value is ShirtStyle {
  return value === "fitted" || value === "unisex";
}

export function isShirtSize(value: unknown): value is ShirtSize {
  return (
    typeof value === "string" && (SHIRT_SIZES as string[]).includes(value)
  );
}

/** Format an epoch-ms timestamp the way it's printed on the shirt. */
export function formatMs(ms: number): string {
  return String(Math.trunc(ms));
}

export function formatHumanDate(ms: number): string {
  return new Date(ms).toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "long",
  });
}
