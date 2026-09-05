/**
 * The entire product catalogue. datetime.store sells exactly one thing: a
 * t-shirt printed with the Unix millisecond timestamp of the moment you bought
 * it. The only choices are cut and size.
 */

export const STYLES = ['fitted', 'unisex'] as const;
export type Style = (typeof STYLES)[number];

export const SIZES = ['S', 'M', 'L', 'XL'] as const;
export type Size = (typeof SIZES)[number];

/** What we charge, in cents. */
export const PRICE_CENTS = 2250;
/** Shown struck through next to the real price, as on the original store. */
export const LIST_PRICE_CENTS = 3000;
export const CURRENCY = 'usd';

/** Every shirt is black; white ink on black is the whole look. */
export const SHIRT_COLOR = 'black';

export const PRODUCTS: Record<
  Style,
  { sku: string; label: string; blurb: string }
> = {
  fitted: {
    sku: 'GLOBAL-TEE-GIL-64000L',
    label: 'Fitted',
    blurb: "Gildan 64000L women's Softstyle, ringspun cotton",
  },
  unisex: {
    sku: 'GLOBAL-TEE-GIL-64000',
    label: 'Unisex',
    blurb: 'Gildan 64000 unisex Softstyle, ringspun cotton',
  },
};

/** Our size labels -> Prodigi's size attribute values. */
export const PRODIGI_SIZE: Record<Size, string> = {
  S: 's',
  M: 'm',
  L: 'l',
  XL: 'xl',
};

/**
 * Countries Prodigi's apparel network ships to that we are comfortable
 * quoting free shipping into. Stripe validates the buyer's address against
 * this list before we ever see the order.
 */
export const SHIPPING_COUNTRIES = [
  'US', 'CA', 'GB', 'IE', 'AU', 'NZ',
  'AT', 'BE', 'CH', 'CZ', 'DE', 'DK', 'ES', 'FI', 'FR',
  'IT', 'NL', 'NO', 'PL', 'PT', 'SE',
  'HK', 'JP', 'SG',
] as const;

/**
 * Timestamps are user-supplied (the browser picks the instant you tap "buy"),
 * so they get validated everywhere they cross a trust boundary: they must be a
 * plausible "now", not an arbitrary number that would let someone mint
 * arbitrary artwork URLs or order a shirt dated 1970.
 */
const EARLIEST_TS = Date.UTC(2017, 0, 1); // the original store's era
/** Allow for clock skew between the buyer's device and our servers. */
const FUTURE_SKEW_MS = 10 * 60 * 1000;

export function parseTimestamp(raw: unknown): number | null {
  const n = typeof raw === 'number' ? raw : Number(String(raw ?? '').trim());
  if (!Number.isSafeInteger(n)) return null;
  if (n < EARLIEST_TS) return null;
  if (n > Date.now() + FUTURE_SKEW_MS) return null;
  return n;
}

export function parseStyle(raw: unknown): Style | null {
  return STYLES.includes(raw as Style) ? (raw as Style) : null;
}

export function parseSize(raw: unknown): Size | null {
  return SIZES.includes(raw as Size) ? (raw as Size) : null;
}

/**
 * How stale a moment may be and still be bought.
 *
 * `parseTimestamp` stays deliberately permissive — artwork for an order placed
 * years ago must keep rendering forever, or reprints and support lookups break.
 * Starting a *new* purchase is different: the browser captures `Date.now()` and
 * posts it immediately, so anything older than this is someone hand-crafting a
 * request to buy a back-dated shirt.
 */
const PURCHASE_FRESHNESS_MS = 30 * 60 * 1000;

export function isPurchasableMoment(ts: number): boolean {
  return Date.now() - ts <= PURCHASE_FRESHNESS_MS;
}

export function formatPrice(cents: number, currency = CURRENCY): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

/** The human-readable name of a shirt, used on receipts and in Prodigi. */
export function describeShirt(ts: number, style: Style, size: Size): string {
  return `datetime tee ${ts} — ${PRODUCTS[style].label}, ${size}, black`;
}
