/**
 * Catalog + pricing. One product: a black tee printed with the current datetime.
 * Two cuts map to two Prodigi SKUs (Bella + Canvas, the brand the original store used).
 */
export type StyleId = "fitted" | "unisex";

export interface StyleDef {
  id: StyleId;
  label: string;
  sku: string;
  description: string;
  sizes: string[];
  /** Front print area for the US/global lab at 300dpi (from GET /v4.0/products/{sku}). */
  printArea: { width: number; height: number };
}

export const STYLES: Record<StyleId, StyleDef> = {
  fitted: {
    id: "fitted",
    label: "Fitted",
    sku: "GLOBAL-TEE-BC-6004",
    description: "Women's Favourite Tee · Bella + Canvas 6004 · 100% cotton",
    sizes: ["S", "M", "L", "XL", "2XL"],
    printArea: { width: 4665, height: 5844 },
  },
  unisex: {
    id: "unisex",
    label: "Unisex",
    sku: "GLOBAL-TEE-BC-3001",
    description: "Unisex Classic Tee · Bella + Canvas 3001 · 100% cotton",
    sizes: ["XS", "S", "M", "L", "XL", "2XL"],
    printArea: { width: 4680, height: 5790 },
  },
};

export const STYLE_IDS = Object.keys(STYLES) as StyleId[];
export const COLOR = "black";
export const CURRENCY = "usd";

/** Retail price in cents. Prodigi's sandbox quote for a black tee + Standard US shipping is ~$17–18. */
export const PRICE_CENTS = parseInt(process.env.PRICE_CENTS ?? "2250", 10);
export const COMPARE_AT_CENTS = parseInt(process.env.COMPARE_AT_CENTS ?? "3000", 10);

/** ISO country codes we ship to. Prodigi ships these SKUs worldwide; pricing here assumes domestic-ish shipping. */
export const SHIP_COUNTRIES = (process.env.SHIP_COUNTRIES ?? "US")
  .split(",")
  .map((c) => c.trim().toUpperCase())
  .filter(Boolean);

export const PRODIGI_SHIPPING_METHOD = "Standard";

export function isStyle(v: unknown): v is StyleId {
  return typeof v === "string" && v in STYLES;
}

export function isSizeFor(style: StyleId, size: unknown): size is string {
  return typeof size === "string" && STYLES[style].sizes.includes(size);
}

export function formatMoney(cents: number, currency = CURRENCY): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

/** A design is fully described by the cut and the millisecond it was bought. */
export interface Design {
  style: StyleId;
  timestamp: number;
}

export function designKey(d: Design): string {
  return `${d.style}-${d.timestamp}`;
}

export function parseDesignKey(key: string): Design | null {
  const m = /^([a-z]+)-(\d{10,16})$/.exec(key);
  if (!m || !isStyle(m[1])) return null;
  return { style: m[1], timestamp: Number(m[2]) };
}

/** Human-readable UTC rendering that goes on the shirt beneath the epoch value. */
export function formatUtc(ms: number): string {
  return new Date(ms).toISOString().replace("T", " ").replace("Z", " UTC");
}
