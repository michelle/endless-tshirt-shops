// Product catalog for the Nightloom tee.
// SKU + attribute values are the exact strings accepted by the Prodigi
// Print API for GLOBAL-TEE-BC-3001 (verified against /v4.0/products in sandbox).

import type { PaletteId } from './palettes';

export const PRODIGI_SKU = 'GLOBAL-TEE-BC-3001';
export const PRODIGI_PRINT_AREA = 'front';
/** Requested print resolution for the front area (4680x5790 px). */
export const PRINT_W = 4680;
export const PRINT_H = 5790;

export const SHIRT_PRICE_CENTS = 3400;
export const SHIPPING_PRICE_CENTS = 699;
export const CURRENCY = 'USD';
export const MAX_QTY = 4;

export interface ShirtColor {
  /** Exact Prodigi `attributes.color` value. */
  id: string;
  label: string;
  /** Storefront swatch. */
  hex: string;
  dark: boolean;
  /** Palettes that look right on this garment (first = default). */
  palettes: PaletteId[];
}

export const SHIRT_COLORS: ShirtColor[] = [
  { id: 'black', label: 'Black', hex: '#141414', dark: true, palettes: ['midnight', 'twilight', 'aurora'] },
  { id: 'navy blue', label: 'Navy', hex: '#1d2a44', dark: true, palettes: ['twilight', 'aurora', 'midnight'] },
  { id: 'dark heather grey', label: 'Dark Heather Grey', hex: '#4a4d52', dark: true, palettes: ['midnight', 'aurora', 'twilight'] },
  { id: 'burgundy', label: 'Burgundy', hex: '#5c2433', dark: true, palettes: ['twilight', 'midnight', 'aurora'] },
  { id: 'military green', label: 'Military Green', hex: '#3d4436', dark: true, palettes: ['aurora', 'midnight', 'twilight'] },
  { id: 'athletic grey heather', label: 'Athletic Grey', hex: '#9aa0a6', dark: false, palettes: ['ivory', 'midnight'] },
  { id: 'white', label: 'White', hex: '#f6f5f1', dark: false, palettes: ['ivory'] },
  { id: 'cream', label: 'Cream', hex: '#efe6d3', dark: false, palettes: ['ivory'] },
  { id: 'natural', label: 'Natural', hex: '#e5dcc8', dark: false, palettes: ['ivory'] },
];

export const SHIRT_SIZES: { id: string; label: string }[] = [
  { id: 'xs', label: 'XS' },
  { id: 's', label: 'S' },
  { id: 'm', label: 'M' },
  { id: 'l', label: 'L' },
  { id: 'xl', label: 'XL' },
  { id: '2xl', label: '2XL' },
  { id: '3xl', label: '3XL' },
  { id: '4xl', label: '4XL' },
];

/** Countries this garment ships to (union of Prodigi variant shipsTo lists). */
export const SHIPS_TO = ('AE,AL,AM,AR,AT,AU,AZ,BA,BB,BD,BE,BG,BH,BM,BN,BO,BR,BS,BY,CA,CH,CI,CL,CN,CO,CR,CY,CZ,DE,DK,DO,EC,EE,EG,ES,FI,FR,GB,GE,GG,GH,GI,GR,HK,HN,HR,HU,ID,IE,IL,IM,IN,IQ,IR,IS,IT,JE,JM,JO,JP,KE,KG,KH,KR,KW,KZ,LB,LK,LT,LU,LV,LY,MA,MC,ME,MK,MQ,MT,MX,MY,NA,NG,NL,NO,NZ,OM,PE,PH,PK,PL,PR,PT,PY,QA,RE,RO,RS,RU,SA,SC,SE,SG,SI,SK,SV,TH,TJ,TR,TT,TW,TZ,UA,US,UY,VE,VI,XK,ZA,ZW').split(',');

/** Country labels for the checkout select (subset order = popular first). */
export const COUNTRY_LABELS: Record<string, string> = {
  US: 'United States', CA: 'Canada', GB: 'United Kingdom', AU: 'Australia',
  DE: 'Germany', FR: 'France', NL: 'Netherlands', ES: 'Spain', IT: 'Italy',
  IE: 'Ireland', SE: 'Sweden', NO: 'Norway', DK: 'Denmark', FI: 'Finland',
  BE: 'Belgium', AT: 'Austria', CH: 'Switzerland', PL: 'Poland', PT: 'Portugal',
  CZ: 'Czechia', GR: 'Greece', HU: 'Hungary', RO: 'Romania', BG: 'Bulgaria',
  HR: 'Croatia', SK: 'Slovakia', SI: 'Slovenia', LT: 'Lithuania', LV: 'Latvia',
  EE: 'Estonia', LU: 'Luxembourg', IS: 'Iceland', JP: 'Japan', NZ: 'New Zealand',
  SG: 'Singapore', HK: 'Hong Kong', KR: 'South Korea', MX: 'Mexico', BR: 'Brazil',
  AR: 'Argentina', CL: 'Chile', CO: 'Colombia', PE: 'Peru', IL: 'Israel',
  AE: 'United Arab Emirates', SA: 'Saudi Arabia', QA: 'Qatar', IN: 'India',
  ZA: 'South Africa', TR: 'Turkey', TW: 'Taiwan', TH: 'Thailand', MY: 'Malaysia',
  PH: 'Philippines', ID: 'Indonesia', VN: 'Vietnam', PR: 'Puerto Rico',
};

export function colorById(id: string): ShirtColor | undefined {
  return SHIRT_COLORS.find((c) => c.id === id);
}

export function totalCents(qty: number): number {
  return qty * SHIRT_PRICE_CENTS + SHIPPING_PRICE_CENTS;
}
