import raw from '@/data/catalog.json';

export type Design = {
  slug: string; trade: string; years: string; local: string;
  motto: string; blurb: string; fact: string;
};

export const DESIGNS = raw as Design[];

export const PRODIGI_SKU = 'GLOBAL-TEE-GIL-64000';

/** Retail price in USD cents. Prodigi cost is ~$15.58 landed (item + budget shipping). */
export const PRICE_CENTS = 3600;
export const PLUS_SIZE_SURCHARGE_CENTS = 300;

export type GarmentColor = {
  /** Must match a Prodigi `color` attribute value exactly. */
  id: string;
  name: string;
  hex: string;
  seam: string;
  /** Which ink version of the artwork to print on this garment. */
  ink: 'light' | 'dark';
};

export const COLORS: GarmentColor[] = [
  { id: 'black',        name: 'Coal',          hex: '#191A1B', seam: '#000000', ink: 'light' },
  { id: 'navy blue',    name: 'Night Watch',   hex: '#252F46', seam: '#161D2C', ink: 'light' },
  { id: 'forest green', name: 'Drive Green',   hex: '#2A3F31', seam: '#1B2A20', ink: 'light' },
  { id: 'maroon',       name: 'Brick Yard',    hex: '#5B2029', seam: '#3E141B', ink: 'light' },
  { id: 'sand',         name: 'Sawdust',       hex: '#D9C7A7', seam: '#BCA987', ink: 'dark'  },
  { id: 'sport grey',   name: 'Ash Grey',      hex: '#C9C7C2', seam: '#ADAAA4', ink: 'dark'  },
  { id: 'white',        name: 'Bleached',      hex: '#F5F4F1', seam: '#D8D6D0', ink: 'dark'  },
];

export const SIZES = ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl'] as const;
export type Size = (typeof SIZES)[number];
export const PLUS_SIZES: string[] = ['2xl', '3xl'];

export const SIZE_LABEL: Record<string, string> = {
  xs: 'XS', s: 'S', m: 'M', l: 'L', xl: 'XL', '2xl': '2XL', '3xl': '3XL',
};

/** Chest width (in) / body length (in) for the Gildan 64000. */
export const SIZE_CHART: Record<string, [number, number]> = {
  xs: [16.5, 27], s: [18, 28], m: [20, 29], l: [22, 30],
  xl: [24, 31], '2xl': [26, 32], '3xl': [28, 33],
};

export function getDesign(slug: string) {
  return DESIGNS.find((d) => d.slug === slug);
}
export function getColor(id: string) {
  return COLORS.find((c) => c.id === id);
}
export function unitPriceCents(size: string) {
  return PRICE_CENTS + (PLUS_SIZES.includes(size) ? PLUS_SIZE_SURCHARGE_CENTS : 0);
}
export function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Artwork URL for a given design + garment colour. */
export function artPath(slug: string, colorId: string) {
  const c = getColor(colorId);
  return `/art/${slug}-${c ? c.ink : 'light'}.png`;
}
export function printPath(slug: string, colorId: string) {
  const c = getColor(colorId);
  return `/prints/${slug}-${c ? c.ink : 'light'}.png`;
}

/** Countries Prodigi fulfils this SKU into, and that we sell to. */
export const SHIP_COUNTRIES = [
  'US','CA','GB','IE','AU','NZ','DE','FR','ES','IT','NL','BE','AT','DK','SE','NO','FI',
  'PT','PL','CZ','HU','GR','CH','LU','SI','SK','EE','LV','LT','HR','BG','RO','IS','MT','CY',
  'JP','SG','HK','KR','MX','BR','ZA','AE','IL','IN','MY','TH','PH','TR','CL','CO','PE',
] as const;
