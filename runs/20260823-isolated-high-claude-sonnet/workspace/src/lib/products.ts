export const PRICE_CENTS = 2250;
export const ORIGINAL_PRICE_CENTS = 3000;
export const CURRENCY = "usd";

export type ShirtStyle = "fitted" | "unisex";
export type ShirtSize = "S" | "M" | "L" | "XL";

export const STYLES: { value: ShirtStyle; label: string; blurb: string }[] = [
  { value: "unisex", label: "Unisex", blurb: "Classic boxy fit" },
  { value: "fitted", label: "Fitted", blurb: "Tailored women's cut" },
];

export const SIZES: ShirtSize[] = ["S", "M", "L", "XL"];

export function isShirtStyle(value: string): value is ShirtStyle {
  return value === "fitted" || value === "unisex";
}

export function isShirtSize(value: string): value is ShirtSize {
  return (SIZES as string[]).includes(value);
}

// Scalable Press (scalablepress.com) product + size catalog IDs.
// Note: "gildan-ultra-ladies-t-shirt" returns a 500 from /v2/quote in the
// Scalable Press test sandbox (verified directly against their API, across
// every color/size) -- "gildan-ladies-missy-t-shirt" is a working substitute
// with the same DTG/Black/White/S-XL support.
export const SP_PRODUCT_IDS: Record<ShirtStyle, string> = {
  fitted: "gildan-ladies-missy-t-shirt",
  unisex: "gildan-cotton-t-shirt",
};

export const SP_SIZE_CODES: Record<ShirtSize, string> = {
  S: "sml",
  M: "med",
  L: "lrg",
  XL: "xlg",
};

export const SP_GARMENT_COLOR = "Black";

export function formatUsd(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}
