// Product catalog: fit / color / size options and how they map to Prodigi
// SKUs + attributes. Keep this file as the single source of truth so the
// storefront UI, the Stripe line item, and the Prodigi order payload can
// never drift out of sync with each other.

export const PRICE_USD = 32;
export const COMPARE_AT_USD = 40;
export const CURRENCY = 'usd';

export type Fit = 'unisex' | 'fitted';

export const FITS: Record<Fit, { label: string; blurb: string; sku: string }> = {
  unisex: {
    label: 'Unisex',
    blurb: 'Classic boxy tee, true to size',
    sku: 'GLOBAL-TEE-GIL-64000',
  },
  fitted: {
    label: 'Fitted',
    blurb: "Women's cut, tapered waist",
    sku: 'GLOBAL-TEE-GIL-64000L',
  },
};

export type ColorId =
  | 'black'
  | 'white'
  | 'navy'
  | 'sportGrey'
  | 'royalBlue'
  | 'red';

// `prodigi` must exactly match the color attribute string Prodigi expects
// for GLOBAL-TEE-GIL-64000 / GLOBAL-TEE-GIL-64000L (verified against the
// sandbox product catalogue — both SKUs share this set).
export const COLORS: Record<
  ColorId,
  { label: string; prodigi: string; swatch: string; ink: 'light' | 'dark' }
> = {
  black: { label: 'Black', prodigi: 'black', swatch: '#161616', ink: 'light' },
  white: { label: 'White', prodigi: 'white', swatch: '#f8f7f4', ink: 'dark' },
  navy: { label: 'Navy Blue', prodigi: 'navy blue', swatch: '#1b2445', ink: 'light' },
  sportGrey: { label: 'Sport Grey', prodigi: 'sport grey', swatch: '#a9a9ac', ink: 'dark' },
  royalBlue: { label: 'Royal Blue', prodigi: 'royal blue', swatch: '#2447c7', ink: 'light' },
  red: { label: 'Cherry Red', prodigi: 'red', swatch: '#af1e2d', ink: 'light' },
};

export type SizeId = 's' | 'm' | 'l' | 'xl' | '2xl' | '3xl';

// `prodigi` matches the lowercase size attribute string used by both SKUs.
export const SIZES: Record<SizeId, { label: string; prodigi: string }> = {
  s: { label: 'S', prodigi: 's' },
  m: { label: 'M', prodigi: 'm' },
  l: { label: 'L', prodigi: 'l' },
  xl: { label: 'XL', prodigi: 'xl' },
  '2xl': { label: '2XL', prodigi: '2xl' },
  '3xl': { label: '3XL', prodigi: '3xl' },
};

export type ThemeId = 'terminal' | 'cottonCandy' | 'starfield' | 'newsprint';

export const THEMES: Record<ThemeId, { label: string; blurb: string }> = {
  terminal: { label: 'Midnight Terminal', blurb: 'Neon monospace, dark mode forever' },
  cottonCandy: { label: 'Cotton Candy Sky', blurb: 'Pastel gradient that follows the sun' },
  starfield: { label: 'Starfield', blurb: 'Constellations around your exact second' },
  newsprint: { label: 'Extra Edition', blurb: 'Breaking news: it is currently right now' },
};

export type ClockFormat = '12h' | '24h';

// Full-bleed print resolution for the "front" print area on
// GLOBAL-TEE-GIL-64000 / 64000L (largest of the two regional variants, so it
// safely covers every shipping destination). Aspect ratio ~= 0.7984.
export const PRINT_WIDTH = 4665;
export const PRINT_HEIGHT = 5844;

export function isValidFit(v: string): v is Fit {
  return v === 'unisex' || v === 'fitted';
}
export function isValidColor(v: string): v is ColorId {
  return Object.prototype.hasOwnProperty.call(COLORS, v);
}
export function isValidSize(v: string): v is SizeId {
  return Object.prototype.hasOwnProperty.call(SIZES, v);
}
export function isValidTheme(v: string): v is ThemeId {
  return Object.prototype.hasOwnProperty.call(THEMES, v);
}
