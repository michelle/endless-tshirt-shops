// Single-product catalog: one shirt, printed with the exact millisecond you buy it.

export const PRICE_CENTS = 2250;
export const COMPARE_AT_CENTS = 3000;
export const CURRENCY = "usd";

export type ShirtStyle = "fitted" | "unisex";
export type ShirtSize = "S" | "M" | "L" | "XL";

export const STYLES: Record<
  ShirtStyle,
  { label: string; prodigiSku: string; garment: string }
> = {
  fitted: {
    label: "Fitted",
    prodigiSku: "GLOBAL-TEE-BC-6004",
    garment: "Bella + Canvas 6004 women's favourite tee",
  },
  unisex: {
    label: "Unisex",
    prodigiSku: "GLOBAL-TEE-GIL-64000",
    garment: "Gildan 64000 unisex softstyle tee",
  },
};

export const SIZES: ShirtSize[] = ["S", "M", "L", "XL"];

// Prodigi size attribute values are lowercase.
export const PRODIGI_SIZE: Record<ShirtSize, string> = {
  S: "s",
  M: "m",
  L: "l",
  XL: "xl",
};

export const GARMENT_COLOR = "black";

// Countries offered at checkout. Both Prodigi SKUs ship to all of these.
export const SHIPPING_COUNTRIES = [
  "US",
  "CA",
  "GB",
  "IE",
  "AU",
  "NZ",
  "DE",
  "FR",
  "NL",
  "ES",
  "IT",
  "SE",
  "DK",
  "NO",
  "FI",
  "AT",
  "BE",
  "CH",
  "JP",
] as const;

export function isShirtStyle(v: unknown): v is ShirtStyle {
  return v === "fitted" || v === "unisex";
}

export function isShirtSize(v: unknown): v is ShirtSize {
  return SIZES.includes(v as ShirtSize);
}
