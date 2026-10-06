// Catalog, pricing and validation of a customer's design. Shared by preview, checkout and print routes.

export const SHIRT_SKU = 'GLOBAL-TEE-GIL-64000';

// `prodigi` is the exact Prodigi colour attribute; `hex` is only for the on-site mockup.
export const SHIRTS = {
  black: { label: 'Black', prodigi: 'black', hex: '#16171a', tone: 'dark' },
  'navy-blue': { label: 'Navy', prodigi: 'navy blue', hex: '#1d2840', tone: 'dark' },
  charcoal: { label: 'Charcoal', prodigi: 'charcoal', hex: '#3b3e43', tone: 'dark' },
  'forest-green': { label: 'Forest', prodigi: 'forest green', hex: '#1e3a2c', tone: 'dark' },
  maroon: { label: 'Maroon', prodigi: 'maroon', hex: '#5b1f2c', tone: 'dark' },
  white: { label: 'White', prodigi: 'white', hex: '#f3f2ee', tone: 'light' },
  sand: { label: 'Sand', prodigi: 'sand', hex: '#d9caaa', tone: 'light' },
};

export const SIZES = ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl'];

// Ink palettes. `disc` fills the sky circle (null = print directly on the fabric).
export const THEMES = {
  starlight: { label: 'Starlight', tone: 'dark', star: '#fdf6e3', line: '#c9d6f2', text: '#fdf6e3', sub: '#d4c9ae', accent: '#f4c969', ring: '#fdf6e3', disc: null, tint: true },
  gilded: { label: 'Gilded', tone: 'dark', star: '#f6d98b', line: '#d4a94a', text: '#f6d98b', sub: '#c9a85c', accent: '#ffffff', ring: '#d4a94a', disc: null, tint: false },
  aurora: { label: 'Aurora', tone: 'dark', star: '#d8fff0', line: '#5fd6b4', text: '#d8fff0', sub: '#8fe3cb', accent: '#ff9ccf', ring: '#5fd6b4', disc: null, tint: false },
  midnight: { label: 'Midnight Ink', tone: 'light', star: '#14213d', line: '#3b4f7e', text: '#14213d', sub: '#4a5a80', accent: '#b4532a', ring: '#14213d', disc: null, tint: false },
  embers: { label: 'Embers', tone: 'light', star: '#5a1f1f', line: '#a4452a', text: '#5a1f1f', sub: '#7c4a3c', accent: '#1f3a5f', ring: '#5a1f1f', disc: null, tint: false },
  'night-disc': { label: 'Night Disc', tone: 'any', star: '#fdf6e3', line: '#8fa6d6', text: null, sub: null, accent: '#f4c969', ring: '#f4c969', disc: '#0e1630', tint: true },
};

export function themesForShirt(shirtKey) {
  const tone = SHIRTS[shirtKey].tone;
  return Object.entries(THEMES).filter(([, t]) => t.tone === tone || t.tone === 'any').map(([k]) => k);
}

export const BASE_PRICE_CENTS = 3800;
export const PLUS_SIZE_SURCHARGE_CENTS = 300; // 2xl and up cost more from Prodigi

export function priceCents(size) {
  return BASE_PRICE_CENTS + (['2xl', '3xl'].includes(size) ? PLUS_SIZE_SURCHARGE_CENTS : 0);
}

// Flat shipping charged to the customer (USD cents), set above Prodigi's quoted standard shipping cost.
export const SHIPPING = {
  US: 599, GB: 599, IE: 799, DE: 799, FR: 799, NL: 799, ES: 799, IT: 799, SE: 899,
  AU: 999, NZ: 1299, CA: 1999,
};
export const COUNTRY_NAMES = {
  US: 'United States', GB: 'United Kingdom', IE: 'Ireland', DE: 'Germany', FR: 'France', NL: 'Netherlands',
  ES: 'Spain', IT: 'Italy', SE: 'Sweden', AU: 'Australia', NZ: 'New Zealand', CA: 'Canada',
};

export const MAX_TITLE = 30;
export const MAX_LINE = 64;
export const MAX_PLACE = 48;

export const DEFAULT_DESIGN = {
  title: 'The Night We Met',
  line: 'Sam & Alex',
  place: 'Paris, France',
  lat: 48.8566,
  lon: 2.3522,
  tz: 'Europe/Paris',
  date: '2019-06-14',
  time: '21:30',
  shirt: 'black',
  theme: 'starlight',
  size: 'm',
  lines: true,
  planets: true,
};

function cleanText(v, max) {
  if (typeof v !== 'string') return '';
  // keep printable characters only; collapse whitespace
  return v.replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function isValidTimeZone(tz) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

// Returns { ok: true, design } or { ok: false, error }.
export function validateDesign(input) {
  const d = { ...DEFAULT_DESIGN, ...(input || {}) };
  const out = {};
  out.title = cleanText(d.title, MAX_TITLE);
  out.line = cleanText(d.line, MAX_LINE);
  out.place = cleanText(d.place, MAX_PLACE);
  if (!out.place) return { ok: false, error: 'Choose a place.' };

  out.lat = Number(d.lat);
  out.lon = Number(d.lon);
  if (!Number.isFinite(out.lat) || Math.abs(out.lat) > 90) return { ok: false, error: 'Invalid latitude.' };
  if (!Number.isFinite(out.lon) || Math.abs(out.lon) > 180) return { ok: false, error: 'Invalid longitude.' };
  out.lat = Math.round(out.lat * 10000) / 10000;
  out.lon = Math.round(out.lon * 10000) / 10000;

  out.tz = String(d.tz || 'UTC');
  if (!isValidTimeZone(out.tz)) return { ok: false, error: 'Invalid time zone.' };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d.date))) return { ok: false, error: 'Choose a date.' };
  const year = Number(String(d.date).slice(0, 4));
  if (year < 1800 || year > 2100) return { ok: false, error: 'Date must be between 1800 and 2100.' };
  const probe = new Date(`${d.date}T00:00:00Z`);
  if (Number.isNaN(probe.getTime()) || probe.toISOString().slice(0, 10) !== d.date) return { ok: false, error: 'Invalid date.' };
  out.date = d.date;

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(d.time))) return { ok: false, error: 'Choose a time.' };
  out.time = d.time;

  if (!SHIRTS[d.shirt]) return { ok: false, error: 'Unknown shirt colour.' };
  out.shirt = d.shirt;
  if (!THEMES[d.theme]) return { ok: false, error: 'Unknown ink theme.' };
  if (!themesForShirt(out.shirt).includes(d.theme)) {
    out.theme = themesForShirt(out.shirt)[0];
  } else {
    out.theme = d.theme;
  }
  if (!SIZES.includes(d.size)) return { ok: false, error: 'Unknown size.' };
  out.size = d.size;
  out.lines = d.lines === true || d.lines === 'true' || d.lines === '1' || d.lines === 1;
  out.planets = d.planets === true || d.planets === 'true' || d.planets === '1' || d.planets === 1;
  return { ok: true, design: out };
}

// Compact, URL/metadata-safe representation (Stripe metadata values are limited to 500 chars).
export function encodeDesign(design) {
  return JSON.stringify([
    design.title, design.line, design.place, design.lat, design.lon, design.tz, design.date, design.time,
    design.shirt, design.theme, design.size, design.lines ? 1 : 0, design.planets ? 1 : 0,
  ]);
}

export function decodeDesign(str) {
  let a;
  try {
    a = JSON.parse(str);
  } catch {
    return { ok: false, error: 'Corrupt design.' };
  }
  if (!Array.isArray(a)) return { ok: false, error: 'Corrupt design.' };
  const [title, line, place, lat, lon, tz, date, time, shirt, theme, size, lines, planets] = a;
  return validateDesign({ title, line, place, lat, lon, tz, date, time, shirt, theme, size, lines: !!lines, planets: !!planets });
}
