// Product catalog for datetime.store.
//
// We sell exactly one idea — a t-shirt printed with the exact datetime you
// bought it — in two cuts. Each cut maps to a real, printable Prodigi SKU.

export type ShirtStyle = "fitted" | "unisex";
export type ShirtSize = "S" | "M" | "L" | "XL";

export const PRICE_USD_CENTS = 2250; // $22.50 (was $30.00)
export const COMPARE_AT_USD_CENTS = 3000; // $30.00

export const SIZES: ShirtSize[] = ["S", "M", "L", "XL"];

// Prodigi expects lowercase size codes.
const PRODIGI_SIZE: Record<ShirtSize, string> = {
  S: "s",
  M: "m",
  L: "l",
  XL: "xl",
};

export const SHIRT_STYLES: Record<
  ShirtStyle,
  {
    label: string;
    description: string;
    /** Prodigi Print API product SKU (sandbox + live share the same catalog). */
    prodigiSku: string;
    prodigiColor: string;
    productName: string;
  }
> = {
  fitted: {
    label: "Fitted",
    description: "Women's fitted crew, Bella + Canvas 6004",
    prodigiSku: "GLOBAL-TEE-BC-6004",
    prodigiColor: "black",
    productName: "datetime.store tee — Fitted",
  },
  unisex: {
    label: "Unisex",
    description: "Unisex softstyle crew, Gildan 64000",
    prodigiSku: "GLOBAL-TEE-GIL-64000",
    prodigiColor: "black",
    productName: "datetime.store tee — Unisex",
  },
};

export function isShirtStyle(v: unknown): v is ShirtStyle {
  return v === "fitted" || v === "unisex";
}

export function isShirtSize(v: unknown): v is ShirtSize {
  return typeof v === "string" && (SIZES as string[]).includes(v);
}

export function prodigiSize(size: ShirtSize): string {
  return PRODIGI_SIZE[size];
}
