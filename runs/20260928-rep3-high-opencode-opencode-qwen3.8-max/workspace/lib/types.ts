import { z } from 'zod';

// ---------------------------------------------------------------------------
// Product options (Prodigi SKU GLOBAL-TEE-BC-3001, Bella + Canvas 3001)
// ---------------------------------------------------------------------------

export interface ShirtColorOption {
  /** Prodigi attribute value */
  id: string;
  label: string;
  /** css colour for the storefront mockup */
  hex: string;
  /** true for garments that need dark ink */
  light: boolean;
  sizes: string[];
}

const ALL_SIZES = ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl'];

export const SHIRT_COLORS: ShirtColorOption[] = [
  { id: 'black', label: 'Black', hex: '#141414', light: false, sizes: ALL_SIZES },
  { id: 'navy blue', label: 'Navy', hex: '#1d2a44', light: false, sizes: ['s', 'm', 'l', 'xl', '2xl', '3xl'] },
  { id: 'burgundy', label: 'Burgundy', hex: '#4a1d2a', light: false, sizes: ['s', 'm', 'l', 'xl', '2xl'] },
  { id: 'dark heather grey', label: 'Heather Grey', hex: '#4a4d52', light: false, sizes: ['s', 'm', 'l', 'xl', '2xl', '3xl'] },
  { id: 'white', label: 'White', hex: '#f4f2ec', light: true, sizes: [...ALL_SIZES, '4xl'] },
  { id: 'cream', label: 'Cream', hex: '#efe6d3', light: true, sizes: [...ALL_SIZES, '4xl'] },
];

export const SIZES = ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl', '4xl'];

export function shirtColor(id: string): ShirtColorOption {
  const c = SHIRT_COLORS.find((x) => x.id === id);
  if (!c) throw new Error(`unknown shirt colour: ${id}`);
  return c;
}

export const PRODIGI_SKU = 'GLOBAL-TEE-BC-3001';

// ---------------------------------------------------------------------------
// Ink palettes
// ---------------------------------------------------------------------------

export interface InkPalette {
  ink: string;
  accent: string;
  sun: string;
  /** 0..1, how much of the natural star colour is kept vs blended to accent */
  starNatural: number;
}

export const INK_STYLES = ['starlight', 'gilded'] as const;
export type InkStyle = (typeof INK_STYLES)[number];

export function paletteFor(colorId: string, style: InkStyle): InkPalette {
  const light = shirtColor(colorId).light;
  if (!light) {
    return style === 'gilded'
      ? { ink: '#F2EDDF', accent: '#D6AE63', sun: '#D6AE63', starNatural: 0.55 }
      : { ink: '#F2EDDF', accent: '#B9CDEA', sun: '#D6AE63', starNatural: 0.5 };
  }
  return style === 'gilded'
    ? { ink: '#182138', accent: '#8F6F32', sun: '#9A7B34', starNatural: 0.55 }
    : { ink: '#182138', accent: '#46618F', sun: '#9A7B34', starNatural: 0.5 };
}

// ---------------------------------------------------------------------------
// Design parameters (validated on every API boundary)
// ---------------------------------------------------------------------------

export const designParamsSchema = z.object({
  v: z.literal(1),
  /** name printed under the chart */
  name: z.string().trim().min(1).max(24),
  /** birth date, YYYY-MM-DD */
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/),
  /** local birth time HH:MM, or null when unknown */
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable(),
  /** display label, e.g. "London, United Kingdom" */
  place: z.string().trim().min(1).max(60),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  /** IANA timezone when a preset city was used */
  tz: z.string().max(64).nullable(),
  /** manual UTC offset in hours (used when tz is null) */
  utcOffset: z.number().min(-12).max(14).nullable(),
  /** optional message line */
  msg: z.string().trim().max(80).default(''),
  style: z.enum(INK_STYLES),
});

export const productSchema = z.object({
  color: z.string().refine((c) => SHIRT_COLORS.some((x) => x.id === c)),
  size: z.string().refine((s) => SIZES.includes(s)),
});

export type DesignParams = z.infer<typeof designParamsSchema>;
export type Product = z.infer<typeof productSchema>;

export function validateProduct(p: Product): asserts p is Product {
  const c = shirtColor(p.color);
  if (!c.sizes.includes(p.size)) throw new Error(`size ${p.size} not available in ${p.color}`);
}

// ---------------------------------------------------------------------------
// Pricing (USD cents)
// ---------------------------------------------------------------------------

export const PRICE_SHIRT_CENTS = 3400;
export const PRICE_SHIPPING_CENTS = 600;
export const PRICE_TOTAL_CENTS = PRICE_SHIRT_CENTS + PRICE_SHIPPING_CENTS;

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
