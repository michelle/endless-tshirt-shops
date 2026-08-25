/**
 * The whole catalog: one t-shirt, printed with the unix millisecond timestamp of
 * the moment it was bought. Two cuts, four sizes, always black.
 */

export const STYLES = ['fitted', 'unisex'] as const;
export const SIZES = ['S', 'M', 'L', 'XL'] as const;

export type Style = (typeof STYLES)[number];
export type Size = (typeof SIZES)[number];

/** Struck-through "list" price, in cents. Shown for the discount framing. */
export const LIST_PRICE = 3000;
/** What we actually charge, in cents. */
export const PRICE = 2250;
export const CURRENCY = 'usd';

/** Shipping is free and baked into the price, matching the original store. */
export const SHIPPING_RATE = {
  id: 'free-shipping',
  displayName: '📦 Free shipping!',
  amount: 0,
} as const;

type Garment = {
  /** Prodigi SKU. */
  sku: string;
  label: string;
  /** Human description used on the Stripe line item and receipts. */
  description: string;
  /** Prodigi colour attribute. */
  color: string;
};

/**
 * Prodigi replaces the original Scalable Press catalog. These are the closest
 * equivalents to the shirts the original store sold (it used a Bella + Canvas
 * ladies' favourite and a Next Level fitted crew).
 */
export const GARMENTS: Record<Style, Garment> = {
  fitted: {
    sku: 'GLOBAL-TEE-BC-6004',
    label: 'Fitted',
    description: "Bella + Canvas 6004 women's favourite tee, black",
    color: 'black',
  },
  unisex: {
    sku: 'GLOBAL-TEE-BC-3001',
    label: 'Unisex',
    description: 'Bella + Canvas 3001 unisex classic tee, black',
    color: 'black',
  },
};

/** Prodigi expects lowercase size attributes. */
export function prodigiSize(size: Size): string {
  return size.toLowerCase();
}

export function isStyle(value: unknown): value is Style {
  return typeof value === 'string' && (STYLES as readonly string[]).includes(value);
}

export function isSize(value: unknown): value is Size {
  return typeof value === 'string' && (SIZES as readonly string[]).includes(value);
}

/**
 * Timestamps are the product, so they get validated like one. Anything outside a
 * sane window is a client bug or someone poking at the API.
 */
export function isValidTimestamp(ts: unknown): ts is number {
  if (typeof ts !== 'number' || !Number.isInteger(ts)) return false;
  // 2020-01-01 .. now + 1 day of clock skew.
  return ts > 1577836800000 && ts < Date.now() + 86_400_000;
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Human-readable rendering of the moment on the shirt, e.g. for receipts. */
export function describeMoment(ts: number): string {
  return new Date(ts).toISOString().replace('T', ' ').replace('Z', ' UTC');
}
