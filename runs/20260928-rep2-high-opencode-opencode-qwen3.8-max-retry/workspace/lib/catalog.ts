/**
 * The single product we sell: a personalised night-sky tee on a
 * Bella+Canvas 3001, fulfilled by Prodigi (global SKU, DTG, ships from
 * the lab nearest the customer).
 *
 * Prodigi attribute values must match the sandbox catalogue exactly —
 * verified against GET /v4.0/products/GLOBAL-TEE-BC-3001.
 */
export const SHIRT_SKU = 'GLOBAL-TEE-BC-3001';
export const SHIRT_LABEL = "Bella+Canvas 3001 · unisex · 100% combed cotton";
export const SHIRT_PRICE_CENTS = 3400;
export const SHIPPING_CENTS = 500;
export const CURRENCY = 'usd';
export const MAX_QTY = 5;

export type ShirtColor = {
  /** equals the Prodigi `color` attribute value */
  id: string;
  name: string;
  /** mockup hex */
  hex: string;
};

export const COLORS: ShirtColor[] = [
  { id: 'black', name: 'Black', hex: '#17171A' },
  { id: 'white', name: 'White', hex: '#F2F0E9' },
  { id: 'navy blue', name: 'Navy', hex: '#232F42' },
  { id: 'dark heather grey', name: 'Heather Grey', hex: '#4C4F55' },
  { id: 'cream', name: 'Cream', hex: '#EDE3CF' },
  { id: 'army', name: 'Army', hex: '#4A5140' },
  { id: 'maroon', name: 'Maroon', hex: '#5C2A35' },
  { id: 'light blue', name: 'Light Blue', hex: '#A9C6DC' },
];

export const SIZES = ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl', '4xl'] as const;
export type Size = (typeof SIZES)[number];

export function isColor(id: unknown): id is string {
  return typeof id === 'string' && COLORS.some((c) => c.id === id);
}

export function isSize(id: unknown): id is Size {
  return typeof id === 'string' && (SIZES as readonly string[]).includes(id);
}

export function getColor(id: string): ShirtColor {
  const found = COLORS.find((c) => c.id === id);
  if (!found) throw new Error(`unknown colour: ${id}`);
  return found;
}

/** Countries Stripe Checkout will collect shipping addresses for. */
export const ALLOWED_COUNTRIES = [
  'US', 'CA', 'GB', 'IE', 'AU', 'NZ',
  'DE', 'FR', 'ES', 'IT', 'NL', 'BE', 'AT', 'PT',
  'SE', 'DK', 'FI', 'PL', 'CH', 'NO',
];

/** Print file geometry — Prodigi's recommended dimensions for this SKU
 *  (15.6in × 19.3in @ 300dpi). The poster sits centred, biased upward
 *  so it lands on the chest, on a transparent canvas. */
export const PRINT_CANVAS = { w: 4677, h: 5787 };
export const PRINT_POSTER = { w: 3560, x: 558, y: 480 };
export const PREVIEW_CANVAS = { w: 700, h: 875 };
