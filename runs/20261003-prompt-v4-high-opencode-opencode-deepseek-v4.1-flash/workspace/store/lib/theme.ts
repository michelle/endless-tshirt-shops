// Shared store configuration: palettes, styles, garments, sizes, pricing.
// Imported by both the browser preview and the server-side renderer.

export type Palette = {
  id: string;
  name: string;
  /** Primary gradient / line colours, ordered. */
  colors: string[];
  /** Colour used for small accent text and details. */
  accent: string;
  /** Short description for the picker. */
  blurb: string;
};

export const PALETTES: Palette[] = [
  {
    id: 'aurora',
    name: 'Aurora',
    colors: ['#5EEAD4', '#22D3EE', '#818CF8', '#C084FC', '#F472B6'],
    accent: '#5EEAD4',
    blurb: 'Teal, cyan and violet light',
  },
  {
    id: 'solar',
    name: 'Solar',
    colors: ['#FDE047', '#FB923C', '#F97316', '#EF4444', '#F43F5E'],
    accent: '#FBBF24',
    blurb: 'Amber, orange and rose',
  },
  {
    id: 'ember',
    name: 'Ember',
    colors: ['#FCA5A5', '#F87171', '#EF4444', '#B91C1C', '#7F1D1D'],
    accent: '#F87171',
    blurb: 'Smouldering reds',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    colors: ['#67E8F9', '#38BDF8', '#3B82F6', '#6366F1', '#0EA5E9'],
    accent: '#38BDF8',
    blurb: 'Deep blue currents',
  },
  {
    id: 'orchid',
    name: 'Orchid',
    colors: ['#F9A8D4', '#E879F9', '#C084FC', '#A78BFA', '#8B5CF6'],
    accent: '#E879F9',
    blurb: 'Pink and purple bloom',
  },
  {
    id: 'jade',
    name: 'Jade',
    colors: ['#BBF7D0', '#4ADE80', '#22C55E', '#14B8A6', '#0D9488'],
    accent: '#4ADE80',
    blurb: 'Green and teal',
  },
  {
    id: 'gold',
    name: 'Gilded',
    colors: ['#FEF3C7', '#FDE68A', '#FCD34D', '#F59E0B', '#B45309'],
    accent: '#FCD34D',
    blurb: 'Warm metallic gold',
  },
  {
    id: 'mono',
    name: 'Mono',
    colors: ['#FFFFFF', '#E5E7EB', '#C7CBD1', '#9CA3AF', '#6B7280'],
    accent: '#E5E7EB',
    blurb: 'Clean black and white',
  },
];

export function getPalette(id: string): Palette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0];
}

export type StyleId = 'topo' | 'rays' | 'orbit';

export const STYLES: { id: StyleId; name: string; blurb: string }[] = [
  { id: 'topo', name: 'Aura', blurb: 'Topographic contour lines' },
  { id: 'rays', name: 'Radiate', blurb: 'Radiating light beams' },
  { id: 'orbit', name: 'Orbit', blurb: 'Orbiting rings and dust' },
];

export function getStyle(id: string): StyleId {
  return (STYLES.find((s) => s.id === id)?.id ?? 'topo') as StyleId;
}

export type Shirt = { id: string; name: string; hex: string };

export const SHIRTS: Shirt[] = [
  { id: 'black', name: 'Midnight Black', hex: '#16181d' },
  { id: 'white', name: 'Natural White', hex: '#f2f0ea' },
];

export function getShirt(id: string): Shirt {
  return SHIRTS.find((s) => s.id === id) ?? SHIRTS[0];
}

export type Size = { id: string; name: string; surcharge: number; prodigiSize: string };

// surcharge is in cents, added to the base price.
export const SIZES: Size[] = [
  { id: 's', name: 'S', surcharge: 0, prodigiSize: 's' },
  { id: 'm', name: 'M', surcharge: 0, prodigiSize: 'm' },
  { id: 'l', name: 'L', surcharge: 0, prodigiSize: 'l' },
  { id: 'xl', name: 'XL', surcharge: 0, prodigiSize: 'xl' },
  { id: '2xl', name: '2XL', surcharge: 200, prodigiSize: '2xl' },
  { id: '3xl', name: '3XL', surcharge: 400, prodigiSize: '3xl' },
  { id: '4xl', name: '4XL', surcharge: 600, prodigiSize: '4xl' },
];

export function getSize(id: string): Size {
  return SIZES.find((s) => s.id === id) ?? SIZES[2];
}

/** Base price in cents (USD). Includes free shipping. */
export const BASE_PRICE_CENTS = 3800;

export const CURRENCY = 'usd';

export const PRODIGI_SKU = 'GLOBAL-TEE-BC-3001';

/** Print canvas size in pixels at 300dpi for the Bella+Canvas 3001 front print. */
export const PRINT_WIDTH = 4677;
export const PRINT_HEIGHT = 5787;

/**
 * Export width for the print file. The vector design is authored on the full
 * 4677px canvas but rasterised at this width (~231 dpi) to keep serverless
 * rendering fast; Prodigi scales it to the print area.
 */
export const PRINT_EXPORT_WIDTH = 3600;
