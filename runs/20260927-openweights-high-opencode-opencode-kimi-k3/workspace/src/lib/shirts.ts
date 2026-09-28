// Product catalog: Bella+Canvas 3001 via Prodigi (SKU GLOBAL-TEE-BC-3001).
// Attribute values (color/size) must match Prodigi's product attributes exactly.
export interface ShirtColor {
  id: string; // Prodigi `color` attribute value
  name: string;
  hex: string; // preview approximation
  dark: boolean;
}

export const SHIRT_COLORS: ShirtColor[] = [
  { id: 'black', name: 'Black', hex: '#17171b', dark: true },
  { id: 'navy blue', name: 'Navy', hex: '#232c3d', dark: true },
  { id: 'asphalt', name: 'Asphalt', hex: '#4a4e52', dark: true },
  { id: 'burgundy', name: 'Burgundy', hex: '#4d2229', dark: true },
  { id: 'white', name: 'White', hex: '#f2f0ea', dark: false },
  { id: 'natural', name: 'Natural', hex: '#e6ddc6', dark: false },
];

export interface Ink {
  id: string;
  name: string;
  hex: string;
  forDark: boolean;
}

export const INKS: Ink[] = [
  { id: 'starlight', name: 'Starlight', hex: '#f0e9d8', forDark: true },
  { id: 'gold', name: 'Comet Gold', hex: '#cfa85f', forDark: true },
  { id: 'rose', name: 'Nebula Rose', hex: '#d9a0a8', forDark: true },
  { id: 'midnight', name: 'Midnight Navy', hex: '#1e2742', forDark: false },
  { id: 'charcoal', name: 'Charcoal', hex: '#2c2c31', forDark: false },
  { id: 'oxblood', name: 'Oxblood', hex: '#53242f', forDark: false },
];

export const SIZES = ['xs', 's', 'm', 'l', 'xl', '2xl'] as const;
export type Size = (typeof SIZES)[number];

export const PRODIGI_SKU = 'GLOBAL-TEE-BC-3001';

export const PRICE_CENTS = 3800; // USD, shipping included
export const MAX_QTY = 5;

export function shirtById(id: string): ShirtColor | undefined {
  return SHIRT_COLORS.find((c) => c.id === id);
}

export function inkById(id: string): Ink | undefined {
  return INKS.find((i) => i.id === id);
}

export function inksForShirt(shirt: ShirtColor): Ink[] {
  return INKS.filter((i) => i.forDark === shirt.dark);
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
