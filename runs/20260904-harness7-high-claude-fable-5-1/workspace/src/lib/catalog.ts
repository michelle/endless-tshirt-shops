import { z } from "zod";

/** Everything about *what* we sell lives here. */

export const CURRENCY = "usd";
export const PRICE_CENTS = 2250; // what the customer pays, shipping included
export const LIST_PRICE_CENTS = 3000; // struck-through "was" price
export const SHIRT_COLOR = "black";

export const STYLE_IDS = ["fitted", "unisex"] as const;
export type StyleId = (typeof STYLE_IDS)[number];

export const SIZE_IDS = ["S", "M", "L", "XL"] as const;
export type SizeId = (typeof SIZE_IDS)[number];

export interface StyleSpec {
  id: StyleId;
  label: string;
  blurb: string;
  /** Prodigi base SKU; colour and size are passed as attributes. */
  sku: string;
  garment: string;
  printArea: string;
  /** Print-area resolution in pixels, from Prodigi product details (300 dpi). */
  printAreaPx: { width: number; height: number };
  /** Physical print-area size in inches (from Prodigi). */
  printAreaIn: { width: number; height: number };
}

export const STYLES: Record<StyleId, StyleSpec> = {
  fitted: {
    id: "fitted",
    label: "Fitted",
    blurb: "Women's favourite tee, slim cut",
    sku: "GLOBAL-TEE-BC-6004",
    garment: "Bella + Canvas 6004, 100% cotton",
    printArea: "front",
    printAreaPx: { width: 4665, height: 5844 },
    printAreaIn: { width: 15.6, height: 19.3 },
  },
  unisex: {
    id: "unisex",
    label: "Unisex",
    blurb: "Classic crew, relaxed fit",
    sku: "GLOBAL-TEE-BC-3001",
    garment: "Bella + Canvas 3001, 100% cotton",
    printArea: "front",
    printAreaPx: { width: 4677, height: 5881 },
    printAreaIn: { width: 15.6, height: 19.3 },
  },
};

/** Prodigi wants lower-case size attribute values. */
export function prodigiSize(size: SizeId): string {
  return size.toLowerCase();
}

/**
 * The timestamp printed on the shirt is chosen by the customer's browser at
 * the instant they click "Buy". We accept it if it is plausibly "now"
 * (allowing for clock skew); anything else is rejected so nobody can order a
 * shirt with an arbitrary number on it.
 */
export const TIMESTAMP_SKEW_MS = 5 * 60 * 1000;

export function timestampIsCurrent(ts: number, now = Date.now()): boolean {
  return Math.abs(now - ts) <= TIMESTAMP_SKEW_MS;
}

export const checkoutRequestSchema = z.object({
  style: z.enum(STYLE_IDS),
  size: z.enum(SIZE_IDS),
  timestamp: z.number().int().positive().max(9_999_999_999_999),
});
export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;

export function formatMoney(cents: number, currency = CURRENCY): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export function describeShirt(style: StyleId, size: SizeId, timestamp: number): string {
  return `datetime.store shirt — ${STYLES[style].label} ${size} — ${timestamp}`;
}
