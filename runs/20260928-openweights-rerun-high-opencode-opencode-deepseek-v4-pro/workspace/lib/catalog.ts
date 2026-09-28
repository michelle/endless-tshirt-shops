// Product catalog: the Bella+Canvas 3001 tee (Prodigi SKU GLOBAL-TEE-BC-3001)
// with a curated set of colours and sizes.

export const SKU = 'GLOBAL-TEE-BC-3001';

export interface ShirtColor {
  id: string;
  /** Prodigi attribute value. */
  prodigi: string;
  label: string;
  /** CSS swatch colour for the UI. */
  swatch: string;
  /** Whether the garment is dark (light ink) or light (dark ink). */
  dark: boolean;
}

export const COLORS: ShirtColor[] = [
  { id: 'black', prodigi: 'black', label: 'Black', swatch: '#1a1a1a', dark: true },
  { id: 'navy', prodigi: 'navy blue', label: 'Navy', swatch: '#1f2a44', dark: true },
  { id: 'white', prodigi: 'white', label: 'White', swatch: '#f5f5f5', dark: false },
  { id: 'cream', prodigi: 'cream', label: 'Cream', swatch: '#efe6d0', dark: false },
  { id: 'natural', prodigi: 'natural', label: 'Natural', swatch: '#e8dfc8', dark: false },
  { id: 'ash', prodigi: 'ash', label: 'Ash', swatch: '#c9c9c9', dark: false },
];

export const SIZES = ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl', '4xl'] as const;

export const PRICE_USD = 38; // flat, shipping included

export function colorById(id: string): ShirtColor {
  const c = COLORS.find((c) => c.id === id);
  if (!c) throw new Error(`Unknown colour: ${id}`);
  return c;
}

export function sizeLabel(size: string): string {
  return size.toUpperCase();
}
