// Product catalog for datetime.store.
//
// We sell exactly one product — a t-shirt printed with the current
// datetime — in two fits and four sizes. Fulfillment is handled by the
// Prodigi Print API, so every style maps to a real Prodigi SKU.

export type ShirtStyle = "fitted" | "unisex";
export type ShirtSize = "S" | "M" | "L" | "XL";

export interface StyleDef {
  id: ShirtStyle;
  label: string;
  description: string;
  /** Prodigi product SKU (sandbox + live share the same catalog). */
  sku: string;
}

export const PRICE_USD_CENTS = 2250;
export const COMPARE_AT_USD_CENTS = 3000;
export const CURRENCY = "usd";

// Both fits ship in black, matching the original datetime.store run.
export const GARMENT_COLOR = "black";

export const STYLES: StyleDef[] = [
  {
    id: "fitted",
    label: "Fitted",
    description: "Softstyle, tailored through the body",
    sku: "GLOBAL-TEE-GIL-64000",
  },
  {
    id: "unisex",
    label: "Unisex",
    description: "Classic boxy fit, heavier cotton",
    sku: "GLOBAL-TEE-GIL-5000",
  },
];

export const SIZES: ShirtSize[] = ["S", "M", "L", "XL"];

export function isShirtStyle(value: unknown): value is ShirtStyle {
  return value === "fitted" || value === "unisex";
}

export function isShirtSize(value: unknown): value is ShirtSize {
  return SIZES.includes(value as ShirtSize);
}

export function styleDef(style: ShirtStyle): StyleDef {
  const def = STYLES.find((s) => s.id === style);
  if (!def) throw new Error(`Unknown shirt style: ${style}`);
  return def;
}

/** Prodigi's `size` attribute is lowercase (s, m, l, xl). */
export function prodigiSizeAttribute(size: ShirtSize): string {
  return size.toLowerCase();
}
