/**
 * Design parameters for a topographic portrait.
 *
 * A Design fully and deterministically describes one piece of artwork:
 * the same parameters always render the same print file. That property is
 * what lets us serve print-ready artwork from a plain URL (which Prodigi
 * downloads at fulfilment time) without any persistent storage.
 *
 * This module is client-safe (no Node APIs).
 */

export type PaletteId = 'ember' | 'alpine' | 'bone' | 'moss' | 'ink' | 'clay';

export type Palette = {
  id: PaletteId;
  name: string;
  /** contour ink colours, low → high elevation */
  stops: [string, string, string];
  /** water body fill */
  water: string;
  /** hillshade tint */
  shade: string;
  shadeMax: number;
  /** primary text ink */
  text: string;
  /** secondary ink (frames, ticks, microcopy) */
  subtle: string;
  /** UI swatch gradient */
  swatchCss: string;
  /** recommended garment tone */
  forGarment: 'dark' | 'light';
};

export const PALETTES: Record<PaletteId, Palette> = {
  ember: {
    id: 'ember',
    name: 'Ember',
    stops: ['#a6402c', '#e2703a', '#f2c66d'],
    water: '#7fa6b8',
    shade: '#ffd9b0',
    shadeMax: 0.16,
    text: '#f4ede2',
    subtle: '#c8a882',
    swatchCss: 'linear-gradient(135deg,#a6402c,#e2703a,#f2c66d)',
    forGarment: 'dark',
  },
  alpine: {
    id: 'alpine',
    name: 'Alpine',
    stops: ['#4e7fa1', '#8fc1d9', '#e4f1f6'],
    water: '#2e5872',
    shade: '#dff0f8',
    shadeMax: 0.14,
    text: '#eaf4f8',
    subtle: '#9dbfd0',
    swatchCss: 'linear-gradient(135deg,#2e5872,#8fc1d9,#e4f1f6)',
    forGarment: 'dark',
  },
  bone: {
    id: 'bone',
    name: 'Bone',
    stops: ['#8f8574', '#d6cbb4', '#f5efe0'],
    water: '#a79c86',
    shade: '#fff8e8',
    shadeMax: 0.1,
    text: '#f1eadb',
    subtle: '#b9ae99',
    swatchCss: 'linear-gradient(135deg,#8f8574,#d6cbb4,#f5efe0)',
    forGarment: 'dark',
  },
  moss: {
    id: 'moss',
    name: 'Moss',
    stops: ['#9aab7d', '#4f6141', '#2c3a24'],
    water: '#6e94a0',
    shade: '#2e3a22',
    shadeMax: 0.12,
    text: '#26301f',
    subtle: '#7a8468',
    swatchCss: 'linear-gradient(135deg,#9aab7d,#4f6141,#2c3a24)',
    forGarment: 'light',
  },
  ink: {
    id: 'ink',
    name: 'Ink',
    stops: ['#9aa0aa', '#4a505c', '#1a1e26'],
    water: '#8aa5b8',
    shade: '#000000',
    shadeMax: 0.09,
    text: '#14171d',
    subtle: '#767c86',
    swatchCss: 'linear-gradient(135deg,#9aa0aa,#4a505c,#1a1e26)',
    forGarment: 'light',
  },
  clay: {
    id: 'clay',
    name: 'Clay',
    stops: ['#c89b7a', '#a0674a', '#6e3f2c'],
    water: '#7fa3a8',
    shade: '#5a3524',
    shadeMax: 0.12,
    text: '#4a2e20',
    subtle: '#a98871',
    swatchCss: 'linear-gradient(135deg,#c89b7a,#a0674a,#6e3f2c)',
    forGarment: 'light',
  },
};

export const PALETTE_LIST: Palette[] = Object.values(PALETTES);

export type GarmentColor = {
  /** exact Prodigi attribute value */
  id: string;
  name: string;
  hex: string;
  tone: 'dark' | 'light';
};

export const GARMENT_COLORS: GarmentColor[] = [
  { id: 'black', name: 'Black', hex: '#17171a', tone: 'dark' },
  { id: 'navy blue', name: 'Navy', hex: '#232f45', tone: 'dark' },
  { id: 'army', name: 'Army', hex: '#4c5341', tone: 'dark' },
  { id: 'burgundy', name: 'Burgundy', hex: '#5c2a35', tone: 'dark' },
  { id: 'dark heather grey', name: 'Dark Heather', hex: '#4c4c52', tone: 'dark' },
  { id: 'white', name: 'White', hex: '#f5f5f1', tone: 'light' },
  { id: 'cream', name: 'Cream', hex: '#efe6d3', tone: 'light' },
  { id: 'ash', name: 'Ash', hex: '#d9d9d4', tone: 'light' },
];

/** Prodigi attribute values are lowercase. */
export const SIZES = ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl', '4xl'] as const;
export type Size = (typeof SIZES)[number];

export function sizeLabel(size: string): string {
  return size.toUpperCase().replace(/^(\d)XL$/, '$1XL');
}

export const RADII = [2, 5, 10, 25, 50, 100, 250] as const;

export const RADIUS_LABELS: Record<number, string> = {
  2: 'a neighbourhood',
  5: 'a town',
  10: 'a valley',
  25: 'a region',
  50: 'a massif',
  100: 'a coastline',
  250: 'a landform',
};

export type Design = {
  lat: number;
  lon: number;
  radiusKm: number;
  label: string;
  caption: string;
  date: string; // '' or yyyy-mm-dd
  palette: PaletteId;
};

const CONTROL_RE = /[\u0000-\u001f\u007f]/g;

function cleanText(v: unknown, max: number): string {
  if (typeof v !== 'string') return '';
  return v.replace(CONTROL_RE, '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function round4(n: number): number {
  return Math.round(n * 1e4) / 1e4;
}

/** Strictly validate + normalise untrusted design input. Returns null when unusable. */
export function sanitizeDesign(input: unknown): Design | null {
  if (!input || typeof input !== 'object') return null;
  const o = input as Record<string, unknown>;

  const lat = Number(o.lat);
  const lon = Number(o.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -84 || lat > 84 || lon < -180 || lon > 180) return null;

  const radiusKm = Number(o.radiusKm);
  if (!RADII.includes(radiusKm as (typeof RADII)[number])) return null;

  const palette = String(o.palette ?? '') as PaletteId;
  if (!(palette in PALETTES)) return null;

  let date = cleanText(o.date, 10);
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) date = '';
  if (date) {
    const d = new Date(`${date}T12:00:00Z`);
    if (Number.isNaN(d.getTime()) || d.getUTCFullYear() < 1800 || d.getTime() > Date.now() + 86400000 * 366) {
      date = '';
    }
  }

  const label = cleanText(o.label, 40);
  if (!label) return null;

  return {
    lat: round4(lat),
    lon: round4(lon),
    radiusKm,
    label,
    caption: cleanText(o.caption, 70),
    date,
    palette,
  };
}

/** Stable JSON (fixed key order) — used for tokens and cache keys. */
export function canonicalDesign(d: Design): string {
  return JSON.stringify({
    lat: d.lat,
    lon: d.lon,
    r: d.radiusKm,
    label: d.label,
    caption: d.caption,
    date: d.date,
    palette: d.palette,
  });
}

const B64URL_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function bytesToB64url(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    out += B64URL_CHARS[b0 >> 2];
    out += B64URL_CHARS[((b0 & 0x03) << 4) | (b1 >> 4)];
    if (i + 1 < bytes.length) out += B64URL_CHARS[((b1 & 0x0f) << 2) | (b2 >> 6)];
    if (i + 2 < bytes.length) out += B64URL_CHARS[b2 & 0x3f];
  }
  return out;
}

function b64urlToBytes(s: string): Uint8Array | null {
  if (!/^[A-Za-z0-9\-_]+$/.test(s)) return null;
  const pad = (4 - (s.length % 4)) % 4;
  const std = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad);
  try {
    const bin = atob(std);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

export function encodeDesign(d: Design): string {
  const bytes = new TextEncoder().encode(canonicalDesign(d));
  return bytesToB64url(bytes);
}

export function decodeDesign(encoded: string): Design | null {
  if (!encoded || encoded.length > 2400) return null;
  const bytes = b64urlToBytes(encoded);
  if (!bytes) return null;
  let json: string;
  try {
    json = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  const o = raw as Record<string, unknown>;
  return sanitizeDesign({
    lat: o.lat,
    lon: o.lon,
    radiusKm: o.r,
    label: o.label,
    caption: o.caption,
    date: o.date,
    palette: o.palette,
  });
}

export function formatCoord(lat: number, lon: number): string {
  const la = `${Math.abs(lat).toFixed(4)}\u00b0 ${lat >= 0 ? 'N' : 'S'}`;
  const lo = `${Math.abs(lon).toFixed(4)}\u00b0 ${lon >= 0 ? 'E' : 'W'}`;
  return `${la} \u00b7 ${lo}`;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function formatDateHuman(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return '';
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export function garmentColor(id: string): GarmentColor | undefined {
  return GARMENT_COLORS.find((c) => c.id === id);
}

export function suggestedPalette(garment: 'dark' | 'light'): PaletteId {
  return garment === 'dark' ? 'ember' : 'ink';
}
