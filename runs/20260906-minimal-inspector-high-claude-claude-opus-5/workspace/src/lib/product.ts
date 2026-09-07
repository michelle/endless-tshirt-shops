/**
 * The whole catalogue: one t-shirt, printed with the millisecond you bought it.
 */

export const LIST_PRICE_CENTS = 3000;
export const PRICE_CENTS = 2250;
export const CURRENCY = 'usd';

/** Prodigi ships this product from the UK/US; we keep the storefront US-only. */
export const SHIP_TO_COUNTRIES = ['US'] as const;

export const SHIPPING_METHOD = 'Budget';

export type ShirtStyle = 'fitted' | 'unisex';
export type ShirtSize = 'S' | 'M' | 'L' | 'XL' | '2XL';

type StyleDef = {
  id: ShirtStyle;
  label: string;
  /** Prodigi catalogue SKU. */
  sku: string;
  blurb: string;
  sizes: readonly ShirtSize[];
};

export const STYLES: Record<ShirtStyle, StyleDef> = {
  fitted: {
    id: 'fitted',
    label: 'Fitted',
    sku: 'GLOBAL-TEE-BC-6004',
    blurb: "Bella + Canvas 6004 — women's favourite tee",
    sizes: ['S', 'M', 'L', 'XL', '2XL'],
  },
  unisex: {
    id: 'unisex',
    label: 'Unisex',
    sku: 'GLOBAL-TEE-BC-3001',
    blurb: 'Bella + Canvas 3001 — unisex classic tee',
    sizes: ['S', 'M', 'L', 'XL', '2XL'],
  },
};

export const STYLE_IDS = Object.keys(STYLES) as ShirtStyle[];
export const SIZES: readonly ShirtSize[] = ['S', 'M', 'L', 'XL', '2XL'];

/** Prodigi expects lowercase size attributes ("2xl", not "XXL"). */
const PRODIGI_SIZE: Record<ShirtSize, string> = {
  S: 's',
  M: 'm',
  L: 'l',
  XL: 'xl',
  '2XL': '2xl',
};

export const SHIRT_COLOR = 'black';

export function prodigiItemAttributes(size: ShirtSize) {
  return { color: SHIRT_COLOR, size: PRODIGI_SIZE[size] };
}

export function skuFor(style: ShirtStyle): string {
  return STYLES[style].sku;
}

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Timestamps are the product, so they get validated like one: 13-digit epoch
 * milliseconds, roughly "now", never something a client made up wholesale.
 */
export const MIN_CAPTURED_AT = 1_000_000_000_000; // 2001-09-09
export const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;
export const MAX_CAPTURE_AGE_MS = 6 * 60 * 60 * 1000;

export function isPlausibleCapturedAt(ts: number, now = Date.now()): boolean {
  if (!Number.isSafeInteger(ts)) return false;
  if (ts < MIN_CAPTURED_AT) return false;
  if (ts > now + MAX_CLOCK_SKEW_MS) return false;
  if (ts < now - MAX_CAPTURE_AGE_MS) return false;
  return true;
}
