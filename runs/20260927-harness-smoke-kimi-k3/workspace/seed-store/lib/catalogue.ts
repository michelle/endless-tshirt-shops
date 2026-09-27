// Store catalogue: palettes, garments, pricing.
// Garment color ids must match Prodigi attribute values for GLOBAL-TEE-BC-3001.

export type Palette = {
  id: string;
  name: string;
  colors: string[];
  accent: string;
  bestOn: 'dark' | 'light' | 'any';
  blurb: string;
};

export const PALETTES: Palette[] = [
  {
    id: 'ember',
    name: 'Ember',
    colors: ['#ff6b35', '#f7c548', '#e63946', '#ffb4a2', '#7f1d1d'],
    accent: '#f7c548',
    bestOn: 'dark',
    blurb: 'Slow-burning oranges and signal reds.',
  },
  {
    id: 'glacier',
    name: 'Glacier',
    colors: ['#a8dadc', '#457b9d', '#1d3557', '#e0fbfc', '#7bdff2'],
    accent: '#e0fbfc',
    bestOn: 'dark',
    blurb: 'Cold water, deep ice, clear air.',
  },
  {
    id: 'bloom',
    name: 'Bloom',
    colors: ['#ff8fa3', '#ffcfd2', '#a3c4f3', '#cfbaf0', '#90dbf4'],
    accent: '#ff8fa3',
    bestOn: 'any',
    blurb: 'Soft pastels with a loud heart.',
  },
  {
    id: 'moss',
    name: 'Moss',
    colors: ['#606c38', '#283618', '#dda15e', '#bc6c25', '#fefae0'],
    accent: '#dda15e',
    bestOn: 'light',
    blurb: 'Forest floor, late sun, dry stone.',
  },
  {
    id: 'ultraviolet',
    name: 'Ultraviolet',
    colors: ['#7209b7', '#b5179e', '#f72585', '#4cc9f0', '#4361ee'],
    accent: '#4cc9f0',
    bestOn: 'dark',
    blurb: 'Neon frequencies off the visible scale.',
  },
  {
    id: 'mono',
    name: 'Mono',
    colors: ['#f8f9fa', '#ced4da', '#868e96', '#495057', '#212529'],
    accent: '#ced4da',
    bestOn: 'dark',
    blurb: 'Grayscale static, perfectly tuned.',
  },
];

export type Garment = {
  id: string; // Prodigi color attribute value
  label: string;
  hex: string;
  dark: boolean;
};

export const GARMENTS: Garment[] = [
  { id: 'black', label: 'Black', hex: '#181818', dark: true },
  { id: 'white', label: 'White', hex: '#f6f6f1', dark: false },
  { id: 'navy blue', label: 'Navy', hex: '#212a3f', dark: true },
  { id: 'asphalt', label: 'Asphalt', hex: '#43464a', dark: true },
  { id: 'cream', label: 'Cream', hex: '#efe6cf', dark: false },
];

export const SIZES = ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl'] as const;
export type Size = (typeof SIZES)[number];

export const PRICE_CENTS = 3900; // $39.00, standard shipping included
export const CURRENCY = 'usd';

export const PRODIGI_SKU = 'GLOBAL-TEE-BC-3001';

export const MAX_WORD_LENGTH = 24;

export const SHIPPING_COUNTRIES = [
  'US', 'CA', 'GB', 'IE', 'FR', 'DE', 'NL', 'BE', 'AT', 'ES', 'IT',
  'PT', 'DK', 'SE', 'NO', 'FI', 'CH', 'AU', 'NZ', 'JP', 'SG',
] as const;

export function getPalette(id: string): Palette | undefined {
  return PALETTES.find((p) => p.id === id);
}

export function getGarment(id: string): Garment | undefined {
  return GARMENTS.find((g) => g.id === id);
}

export function normalizeWord(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, MAX_WORD_LENGTH);
}
