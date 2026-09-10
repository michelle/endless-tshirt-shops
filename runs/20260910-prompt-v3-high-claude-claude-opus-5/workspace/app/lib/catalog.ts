// Single Prodigi product, printed direct-to-garment. Retail prices are held
// server-side; nothing the browser sends can change what a customer is charged.

export const PRODIGI_SKU = 'GLOBAL-TEE-GIL-64000';
export const PRINT_AREA = 'front';

export type GarmentColor = {
  id: string;        // must match a Prodigi `color` attribute value
  name: string;
  hex: string;
  dark: boolean;     // chooses the light-ink or dark-ink half of the palette
};

export const COLORS: GarmentColor[] = [
  { id: 'natural', name: 'Natural', hex: '#e8ddc8', dark: false },
  { id: 'white', name: 'White', hex: '#f7f7f5', dark: false },
  { id: 'sand', name: 'Sand', hex: '#d9cdb6', dark: false },
  { id: 'sport grey', name: 'Sport Grey', hex: '#c3c3c1', dark: false },
  { id: 'light blue', name: 'Light Blue', hex: '#b9cede', dark: false },
  { id: 'sapphire blue', name: 'Sapphire', hex: '#1f4e79', dark: true },
  { id: 'forest green', name: 'Forest Green', hex: '#22372a', dark: true },
  { id: 'maroon', name: 'Maroon', hex: '#5a2233', dark: true },
  { id: 'dark chocolate', name: 'Dark Chocolate', hex: '#39302b', dark: true },
  { id: 'black', name: 'Black', hex: '#1b1b1b', dark: true },
];

export const COLOR_BY_ID = Object.fromEntries(COLORS.map((c) => [c.id, c]));

export type Size = { id: string; name: string; priceCents: number };

export const SIZES: Size[] = [
  { id: 'xs', name: 'XS', priceCents: 4400 },
  { id: 's', name: 'S', priceCents: 4400 },
  { id: 'm', name: 'M', priceCents: 4400 },
  { id: 'l', name: 'L', priceCents: 4400 },
  { id: 'xl', name: 'XL', priceCents: 4400 },
  { id: '2xl', name: '2XL', priceCents: 4700 },
  { id: '3xl', name: '3XL', priceCents: 4900 },
];

export const SIZE_BY_ID = Object.fromEntries(SIZES.map((s) => [s.id, s]));

export const MAX_QTY = 5;
export const CURRENCY = 'USD';
