import type { ShirtColor, ShirtSize } from './types';

export interface ShirtOption {
  color: ShirtColor;
  /** human friendly label */
  label: string;
  /** UI hex color (for swatch preview only) */
  swatch: string;
  /** light or dark tee — used for design foreground */
  ink: 'light' | 'dark';
}

export const SHIRT_SKU = 'GLOBAL-TEE-GIL-5000';

export const SHIRTS: ShirtOption[] = [
  { color: 'white',        label: 'Bone',            swatch: '#f5f1ea', ink: 'dark' },
  { color: 'black',        label: 'Pitch',           swatch: '#0c0c0d', ink: 'light' },
  { color: 'navy blue',    label: 'Deep Sea',        swatch: '#1a2540', ink: 'light' },
  { color: 'heather grey', label: 'Heather Grey',    swatch: '#b5b3ad', ink: 'dark' },
  { color: 'sport grey',   label: 'Sport Grey',      swatch: '#8d8b85', ink: 'dark' },
  { color: 'charcoal',     label: 'Charcoal',        swatch: '#3a3a3a', ink: 'light' },
  { color: 'red',          label: 'Cardinal',        swatch: '#a02323', ink: 'light' },
];

/** Canonical ink hex per shirt — used by the design renderer. */
export const INK_HEX = {
  light: '#f5f1ea',
  dark: '#0c0c0d',
} as const;

export const SIZES: ShirtSize[] = ['s', 'm', 'l', 'xl', '2xl'];

export const SIZE_LABELS: Record<ShirtSize, string> = {
  s: 'Small',
  m: 'Medium',
  l: 'Large',
  xl: 'X-Large',
  '2xl': '2X-Large',
};

/** Production area in pixels at 300dpi, used to render the design at print resolution. */
export const PRINT_AREA_WIDTH_PX = 4677;
export const PRINT_AREA_HEIGHT_PX = 5787;

/** Retail price in cents (Stripe convention). Cost is around $16.50-$20 depending on size. */
export const PRICE_CENTS = 3499;

/** Maximum concurrent sub-pixel exports kept in memory (key = design hash). */
export const DESIGN_CACHE_LIMIT = 32;
