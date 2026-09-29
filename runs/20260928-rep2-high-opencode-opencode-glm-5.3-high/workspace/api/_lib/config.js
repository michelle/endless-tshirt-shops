// Nightshift's product definition — the single source of truth for what the
// store sells, what it costs, and what the customer may configure. The client
// fetches it via /api/catalog; the server validates every order against it,
// so prices are always computed server-side and never trusted from the client.

export const STORE = {
  name: 'Nightshift',
  tagline: 'The sky above the moment that mattered.',
  description:
    'A one-of-one tee, printed with the night sky exactly as it stood over your place and moment. No two are ever alike.',
  currency: 'usd',
};

// Prodigi DTG product (Bella + Canvas 3001 unisex crew) — a single global SKU
// that Prodigi routes to the print lab nearest the recipient.
export const PRODIGI_SKU = 'GLOBAL-TEE-BC-3001';
export const PRODIGI_SIZING = 'fillPrintArea';

// Front-print pixels at 300 DPI for a 12" x 16" chest print. Prodigi's
// DTG variants accept ~0.70–0.81 aspect files; fillPrintArea crops only the
// transparent margins, and every meaningful mark sits inside the safe disc.
export const PRINT_WIDTH = 3600;
export const PRINT_HEIGHT = 4800;

// DTG variants exist for these exact attribute values on the Prodigi SKU.
export const GARMENT_COLORS = [
  { id: 'white', label: 'White', prodigi: 'white', proof: '#ffffff', ink: 'dark' },
  { id: 'cream', label: 'Cream', prodigi: 'cream', proof: '#f1e9d6', ink: 'dark' },
  { id: 'black', label: 'Black', prodigi: 'black', proof: '#191b1f', ink: 'light' },
  { id: 'navy', label: 'Navy', prodigi: 'navy blue', proof: '#1e2a44', ink: 'light' },
];

export const SIZES = [
  { id: 'xs', label: 'XS', cents: 3800 },
  { id: 's', label: 'S', cents: 3800 },
  { id: 'm', label: 'M', cents: 3800 },
  { id: 'l', label: 'L', cents: 3800 },
  { id: 'xl', label: 'XL', cents: 3800 },
  { id: '2xl', label: '2XL', cents: 4000 },
  { id: '3xl', label: '3XL', cents: 4200 },
  { id: '4xl', label: '4XL', cents: 4400 },
];

export const QUANTITY_LIMIT = 5;

export const SHIPPING = [
  { id: 'us', label: 'US shipping', cents: 650, countries: ['US'] },
  { id: 'intl', label: 'International shipping', cents: 1400, countries: null },
];

// Sky styles. `disc` colors are drawn on the shirt; on light garments the
// surrounding area stays transparent (no ink), on dark ones Prodigi lays a
// white underbase behind the disc automatically.
export const THEMES = [
  {
    id: 'aurora',
    label: 'Aurora',
    disc: { zenith: '#0b1d3a', horizon: '#12355f', ring: '#7ba0cf' },
    star: { core: '#f4f6ff', halo: '#9db6e8' },
    line: '#4f6d9e',
    text: '#101a2c',
  },
  {
    id: 'ember',
    label: 'Ember',
    disc: { zenith: '#1a1026', horizon: '#3c1830', ring: '#b98aa8' },
    star: { core: '#ffe9d6', halo: '#c98d6d' },
    line: '#8a5a70',
    text: '#241428',
  },
  {
    id: 'tide',
    label: 'Tide',
    disc: { zenith: '#032e2b', horizon: '#0a5149', ring: '#8fd0c2' },
    star: { core: '#eafff7', halo: '#8fcfbd' },
    line: '#4e8f84',
    text: '#0a2320',
  },
];

// A generous set of countries the Prodigi global tee ships to; kept as a
// server-side allowlist so the selector can't be tampered with client-side.
export const SHIPPABLE_COUNTRIES = [
  'AE', 'AR', 'AT', 'AU', 'BB', 'BE', 'BG', 'BH', 'BM', 'BO', 'BR', 'BS',
  'BY', 'CA', 'CH', 'CL', 'CN', 'CO', 'CR', 'CY', 'CZ', 'DE', 'DK', 'DO',
  'EC', 'EE', 'EG', 'ES', 'FI', 'FR', 'GB', 'GH', 'GR', 'HK', 'HR', 'HU',
  'ID', 'IE', 'IL', 'IN', 'IQ', 'IS', 'IT', 'JO', 'JP', 'KE', 'KR', 'KW',
  'LB', 'LI', 'LT', 'LU', 'LV', 'MA', 'MC', 'MT', 'MX', 'MY', 'NG', 'NL',
  'NO', 'NZ', 'PA', 'PE', 'PH', 'PL', 'PT', 'QA', 'RO', 'RS', 'SA', 'SE',
  'SG', 'SI', 'SK', 'SM', 'TH', 'TN', 'TR', 'TW', 'UA', 'US', 'UY', 'VN',
  'ZA',
];

export function findSize(id) {
  return SIZES.find((size) => size.id === id) || null;
}

export function findColor(id) {
  return GARMENT_COLORS.find((color) => color.id === id) || null;
}

export function findTheme(id) {
  return THEMES.find((theme) => theme.id === id) || null;
}

export function shippingFor(countryCode) {
  const code = String(countryCode || '').toUpperCase();
  const domestic = SHIPPING.find((option) => option.countries?.includes(code));
  return domestic || SHIPPING[SHIPPING.length - 1];
}

// Authoritative price for an order — computed only from this module's tables.
export function priceCents({ sizeId, quantity, countryCode }) {
  const size = findSize(sizeId);
  if (!size) return null;
  const qty = Math.min(Math.max(1, quantity | 0), QUANTITY_LIMIT);
  const shipping = shippingFor(countryCode);
  return {
    unitCents: size.cents,
    quantity: qty,
    subtotalCents: size.cents * qty,
    shippingCents: shipping.cents,
    totalCents: size.cents * qty + shipping.cents,
  };
}

// The serialized design passed through Stripe metadata, kept small on purpose.
export function catalogPayload() {
  return {
    store: STORE,
    prodigiSku: PRODIGI_SKU,
    print: { width: PRINT_WIDTH, height: PRINT_HEIGHT },
    themes: THEMES,
    colors: GARMENT_COLORS,
    sizes: SIZES,
    quantityLimit: QUANTITY_LIMIT,
    shipping: SHIPPING,
    countries: SHIPPABLE_COUNTRIES,
  };
}
