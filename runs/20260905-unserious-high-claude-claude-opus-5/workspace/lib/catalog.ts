/**
 * The entire product catalogue. There is one product. It has one design,
 * which changes 1,000 times a second.
 */

export const PRODIGI_SKU = 'GLOBAL-TEE-GIL-64000'; // Gildan 64000 Softstyle, unisex

/** Price in cents. The "was" price never actually existed. */
export const PRICE_CENTS = 2250;
export const COMPARE_AT_CENTS = 3000;
export const CURRENCY = 'usd';

export const SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL'] as const;
export type Size = (typeof SIZES)[number];

/** Prodigi expects lowercase size attributes. */
export function prodigiSize(size: Size): string {
  return size.toLowerCase();
}

export type Colour = {
  /** Value used in URLs, Stripe metadata and the Prodigi `color` attribute. */
  id: string;
  label: string;
  /** Preview fill for the garment SVG. */
  hex: string;
  /** Ink that actually shows up on this garment. */
  ink: 'white' | 'black';
};

/**
 * A deliberately small edit of the 27 Gildan colourways. Each one is a real
 * Prodigi `color` attribute value for GLOBAL-TEE-GIL-64000.
 */
export const COLOURS: Colour[] = [
  { id: 'black', label: 'Black', hex: '#16161a', ink: 'white' },
  { id: 'navy blue', label: 'Navy', hex: '#1f2a44', ink: 'white' },
  { id: 'forest green', label: 'Forest', hex: '#23402f', ink: 'white' },
  { id: 'maroon', label: 'Maroon', hex: '#4d1f28', ink: 'white' },
  { id: 'purple', label: 'Purple', hex: '#41305e', ink: 'white' },
  { id: 'sport grey', label: 'Sport Grey', hex: '#b4b4b0', ink: 'black' },
  { id: 'sand', label: 'Sand', hex: '#d9c9a8', ink: 'black' },
  { id: 'white', label: 'White', hex: '#f4f4f1', ink: 'black' },
];

export const DEFAULT_COLOUR = COLOURS[0];

export function findColour(id: string | undefined | null): Colour | undefined {
  return COLOURS.find((c) => c.id === id);
}

export type Fit = 'classic' | 'fitted';

export const FITS: { id: Fit; label: string; blurb: string }[] = [
  { id: 'classic', label: 'Classic', blurb: 'Boxy. Roomy. Forgiving of the passage of time.' },
  { id: 'fitted', label: 'Fitted', blurb: 'Tapered. Implies you have somewhere to be.' },
];

export function isFit(v: unknown): v is Fit {
  return v === 'classic' || v === 'fitted';
}

export function isSize(v: unknown): v is Size {
  return typeof v === 'string' && (SIZES as readonly string[]).includes(v);
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Where we ship. Prodigi has labs on several continents; this is the subset we
 * let Stripe collect addresses for.
 */
export const SHIPPING_COUNTRIES = [
  'US', 'CA', 'GB', 'IE', 'AU', 'NZ', 'DE', 'FR', 'ES', 'IT', 'NL',
  'BE', 'AT', 'DK', 'SE', 'NO', 'FI', 'PL', 'PT', 'CH', 'CZ', 'JP', 'SG',
] as const;
