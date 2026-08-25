export const PRICE_CENTS = 2250;
export const ORIGINAL_PRICE_CENTS = 3000;

export type ShirtStyle = 'fitted' | 'unisex';
export type ShirtSize = 'S' | 'M' | 'L' | 'XL';

export const STYLES: ShirtStyle[] = ['fitted', 'unisex'];
export const SIZES: ShirtSize[] = ['S', 'M', 'L', 'XL'];

// Prodigi print-on-demand SKUs. The original store used Scalable Press's
// "bella-ladies-favorite-t-shirt" / unisex crew; these are the closest
// Prodigi equivalents, printed DTG, front print area, in black.
export const PRODIGI_PRODUCTS: Record<
  ShirtStyle,
  { sku: string; color: string; label: string }
> = {
  fitted: {
    sku: 'GLOBAL-TEE-BC-6004',
    color: 'black',
    label: "Women's Favourite T-shirt, Bella + Canvas 6004",
  },
  unisex: {
    sku: 'GLOBAL-TEE-BC-3001',
    color: 'black',
    label: 'Unisex Classic T-shirt, Bella + Canvas 3001',
  },
};

// Prodigi size attribute values are lowercase.
export const PRODIGI_SIZES: Record<ShirtSize, string> = {
  S: 's',
  M: 'm',
  L: 'l',
  XL: 'xl',
};

export function isValidStyle(s: unknown): s is ShirtStyle {
  return typeof s === 'string' && (STYLES as string[]).includes(s);
}

export function isValidSize(s: unknown): s is ShirtSize {
  return typeof s === 'string' && (SIZES as string[]).includes(s);
}

// A plausible epoch-milliseconds timestamp: 13 digits, i.e. Sep 2001 – Nov 2286.
export function isValidTimestamp(ts: unknown): ts is string {
  return typeof ts === 'string' && /^\d{13}$/.test(ts);
}
