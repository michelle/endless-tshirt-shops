/**
 * Product catalog. One product: a black t-shirt printed with the exact
 * millisecond timestamp at which you bought it.
 *
 * Fulfilment is via Prodigi (https://www.prodigi.com/print-api/docs/).
 * SKUs were verified against the Prodigi sandbox catalogue:
 *   GLOBAL-TEE-BC-3001  Unisex Classic T-shirt, Bella + Canvas 3001
 *   GLOBAL-TEE-BC-6004  Women's Favourite T-shirt, Bella + Canvas 6004 (fitted)
 */

export const STYLES = ["fitted", "unisex"] as const;
export type ShirtStyle = (typeof STYLES)[number];

export const SIZES = ["S", "M", "L", "XL"] as const;
export type ShirtSize = (typeof SIZES)[number];

export const CURRENCY = "usd";
/** Price in the smallest currency unit (cents). */
export const PRICE_CENTS = 2250;
export const COMPARE_AT_CENTS = 3000;
export const SHIRT_COLOR = "black";

/** Countries we ship to. Prodigi ships worldwide but pricing/tax here assumes US. */
export const ALLOWED_COUNTRIES = ["US"] as const;

export const PRODIGI_SKUS: Record<ShirtStyle, string> = {
  fitted: "GLOBAL-TEE-BC-6004",
  unisex: "GLOBAL-TEE-BC-3001",
};

export const STYLE_LABELS: Record<ShirtStyle, string> = {
  fitted: "Fitted",
  unisex: "Unisex",
};

export const STYLE_DESCRIPTIONS: Record<ShirtStyle, string> = {
  fitted: "Bella + Canvas 6004 women's favourite tee",
  unisex: "Bella + Canvas 3001 unisex classic tee",
};

/** Prodigi size attribute values are lowercase. */
export function prodigiSize(size: ShirtSize): string {
  return size.toLowerCase();
}

export function isShirtStyle(value: unknown): value is ShirtStyle {
  return typeof value === "string" && (STYLES as readonly string[]).includes(value);
}

export function isShirtSize(value: unknown): value is ShirtSize {
  return typeof value === "string" && (SIZES as readonly string[]).includes(value);
}

export function formatPrice(cents: number, currency = CURRENCY): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(
    cents / 100,
  );
}
