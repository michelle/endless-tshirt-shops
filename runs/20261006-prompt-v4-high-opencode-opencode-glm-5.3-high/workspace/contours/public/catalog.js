// Contours — shared catalog. Used by the browser (preview) and the server (re-pricing).
// Single source of truth: never trust prices from the client.

export const SKU = 'GLOBAL-TEE-BC-3001'; // Bella + Canvas 3001, unisex crew

export const PRODUCT_NAME = 'Contours Tee';
export const PRODUCT_DESC =
  'A minimalist topographic map of the place you choose, drawn from real elevation data and direct-to-garment printed on a Bella + Canvas 3001.';

// Ink colours: every colour is a real Prodigi variant attribute value.
// "ink" decides the print colour so the artwork always reads clearly.
export const COLORS = [
  { key: 'white', label: 'White', hex: '#f4f3ef', prodigi: 'white', ink: 'dark', swatchLight: true },
  { key: 'cream', label: 'Cream', hex: '#f1e9d9', prodigi: 'cream', ink: 'dark', swatchLight: true },
  { key: 'natural', label: 'Natural', hex: '#e7ded1', prodigi: 'natural', ink: 'dark', swatchLight: true },
  { key: 'ash', label: 'Ash', hex: '#dcdcd7', prodigi: 'ash', ink: 'dark', swatchLight: true },
  { key: 'athletic-grey-heather', label: 'Athletic Grey Heather', hex: '#cfcfc9', prodigi: 'athletic grey heather', ink: 'dark', swatchLight: true },
  { key: 'black', label: 'Black', hex: '#232326', prodigi: 'black', ink: 'light' },
  { key: 'navy-blue', label: 'Navy Blue', hex: '#2c3a52', prodigi: 'navy blue', ink: 'light' },
  { key: 'military-green', label: 'Military Green', hex: '#4b5340', prodigi: 'military green', ink: 'light' },
  { key: 'dark-heather-grey', label: 'Dark Heather Grey', hex: '#41413f', prodigi: 'dark heather grey', ink: 'light' },
];

// Which sizes exist per colour, verified against the Prodigi product catalogue.
export const COLOR_SIZES = {
  white: ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl', '4xl'],
  cream: ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl', '4xl'],
  natural: ['s', 'm', 'l', 'xl', '2xl', '3xl'],
  ash: ['s', 'm', 'l', 'xl', '2xl', '3xl'],
  'athletic-grey-heather': ['s', 'm', 'l', 'xl', '2xl', '3xl'],
  black: ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl', '4xl'],
  'navy-blue': ['s', 'm', 'l', 'xl', '2xl', '3xl'],
  'military-green': ['s', 'm', 'l', 'xl', '2xl', '3xl'],
  'dark-heather-grey': ['s', 'm', 'l', 'xl', '2xl', '3xl'],
};

export const SIZES = [
  { key: 'xs', label: 'XS' },
  { key: 's', label: 'S' },
  { key: 'm', label: 'M' },
  { key: 'l', label: 'L' },
  { key: 'xl', label: 'XL' },
  { key: '2xl', label: '2XL', upchargeCents: 400 },
  { key: '3xl', label: '3XL', upchargeCents: 400 },
  { key: '4xl', label: '4XL', upchargeCents: 400 },
];

// Map windows. "km" is the square window centred on the chosen coordinates.
export const EXTENTS = [
  { km: 2.5, key: 'intimate', label: 'The spot', hint: '≈ 2.5 km across — a summit, a crag, your street' },
  { km: 6, key: 'valley', label: 'The valley', hint: '≈ 6 km across — the lake, the climb, the town bowl' },
  { km: 15, key: 'massif', label: 'The massif', hint: '≈ 15 km across — the whole mountain' },
  { km: 40, key: 'region', label: 'The region', hint: '≈ 40 km across — the island, the range, the horizon' },
];

export const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'AT', name: 'Austria' },
  { code: 'BE', name: 'Belgium' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'CZ', name: 'Czechia' },
  { code: 'DE', name: 'Germany' },
  { code: 'DK', name: 'Denmark' },
  { code: 'ES', name: 'Spain' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'GR', name: 'Greece' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NO', name: 'Norway' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'SE', name: 'Sweden' },
];

// Retail pricing (cents). Server recomputes from these — the client never sets a price.
export const BASE_PRICE_CENTS = 3900;

export function unitPriceCents(sizeKey) {
  const s = SIZES.find((x) => x.key === sizeKey);
  return BASE_PRICE_CENTS + (s?.upchargeCents || 0);
}

export function shirtPriceCents(sizeKey, qty) {
  return unitPriceCents(sizeKey) * qty;
}

export function validateColorSize(colorKey, sizeKey) {
  const allowed = COLOR_SIZES[colorKey];
  if (!allowed) return false;
  return allowed.includes(sizeKey);
}

export function colorByKey(key) {
  return COLORS.find((c) => c.key === key);
}

export function extentByKey(key) {
  return EXTENTS.find((e) => e.key === key);
}

// Shipping retail from a Prodigi cost, in cents: cost × 1.3, rounded up to the
// dollar, floored at $5 and capped at $29 so no destination is ever silly.
export function shippingRetailCents(prodigiCostAmount) {
  const cost = Math.round(parseFloat(prodigiCostAmount) * 100);
  const raw = cost * 1.3;
  let retail = Math.ceil(raw / 100) * 100;
  retail = Math.min(Math.max(retail, 500), 2900);
  return retail;
}

export const SHIPPING_METHODS = [
  { key: 'budget', label: 'Budget', prodigi: 'Budget', hint: 'The slow boat' },
  { key: 'standard', label: 'Standard', prodigi: 'Standard', hint: 'Tracked, steady' },
];

export const MAX_TITLE_LEN = 40;
export const MAX_PLACE_LEN = 48;
