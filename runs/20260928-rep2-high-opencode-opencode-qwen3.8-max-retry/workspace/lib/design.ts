import { createHmac, timingSafeEqual } from 'node:crypto';
import { PALETTES, PLACE_MAX, CAPTION_MAX, type Palette } from './palettes';

export { PALETTES, PLACE_MAX, CAPTION_MAX };
export type { Palette };

/**
 * The design spec is the single source of truth for a customer's night.
 * It travels three ways:
 *  1. client -> POST /api/checkout (raw JSON)
 *  2. inside Stripe Checkout Session metadata (compact JSON)
 *  3. as a signed query string on GET /api/design (the artwork URL Prodigi downloads)
 * Nothing is stored in a database; the signature is what makes the URL trustworthy.
 */
export type DesignInput = {
  v: 1;
  /** ISO date, YYYY-MM-DD — the night being commemorated */
  date: string;
  /** Free-text place label, e.g. "Reykjavík" */
  place: string;
  /** Short caption, e.g. "the night we met" (may be empty) */
  caption: string;
  /** Palette id from PALETTES */
  palette: string;
};

export class ValidationError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function cleanText(value: unknown, max: number, field: string): string {
  if (typeof value !== 'string') throw new ValidationError(`${field} must be a string`);
  // Strip control characters; keep unicode (accented place names etc).
  const text = value.replace(/[\u0000-\u001F\u007F]/g, '').trim();
  if (text.length > max) throw new ValidationError(`${field} must be at most ${max} characters`);
  return text;
}

export function isValidDate(date: string): boolean {
  if (!DATE_RE.test(date)) return false;
  const [y, m, d] = date.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function validateDesign(raw: unknown): DesignInput {
  if (typeof raw !== 'object' || raw === null) throw new ValidationError('design must be an object');
  const r = raw as Record<string, unknown>;
  const date = cleanText(r.date, 10, 'date');
  if (!isValidDate(date)) throw new ValidationError('date must be a real YYYY-MM-DD date');
  const now = Date.now();
  const ts = Date.parse(date + 'T00:00:00Z');
  if (ts < Date.UTC(1900, 0, 1)) throw new ValidationError('date must be in 1900 or later');
  if (ts > now + 366 * 86400000) throw new ValidationError('date must be at most one year in the future');
  const place = cleanText(r.place, PLACE_MAX, 'place');
  if (place.length < 1) throw new ValidationError('place is required');
  const caption = cleanText(r.caption ?? '', CAPTION_MAX, 'caption');
  const palette = cleanText(r.palette, 32, 'palette');
  if (!PALETTES.some((p) => p.id === palette)) throw new ValidationError('unknown palette');
  return { v: 1, date, place, caption, palette };
}

export function getPalette(id: string): Palette {
  const found = PALETTES.find((p) => p.id === id);
  if (!found) throw new ValidationError('unknown palette');
  return found;
}

// ---------------------------------------------------------------------------
// Signed payload encoding (HMAC-SHA256 over canonical JSON)
// ---------------------------------------------------------------------------

function signingKey(): string {
  const key = process.env.ARTWORK_SIGNING_KEY;
  if (!key) throw new Error('ARTWORK_SIGNING_KEY is not configured');
  return key;
}

function canonical(design: DesignInput): string {
  return JSON.stringify({ v: 1, date: design.date, place: design.place, caption: design.caption, palette: design.palette });
}

export function encodeDesign(design: DesignInput): { d: string; sig: string } {
  const json = canonical(design);
  const d = Buffer.from(json, 'utf8').toString('base64url');
  const sig = createHmac('sha256', signingKey()).update(json).digest('hex');
  return { d, sig };
}

export function decodeDesign(d: unknown, sig: unknown): DesignInput | null {
  if (typeof d !== 'string' || typeof sig !== 'string') return null;
  if (!/^[a-f0-9]{64}$/.test(sig)) return null;
  let json: string;
  try {
    json = Buffer.from(d, 'base64url').toString('utf8');
  } catch {
    return null;
  }
  const expected = Buffer.from(createHmac('sha256', signingKey()).update(json).digest('hex'), 'utf8');
  const provided = Buffer.from(sig, 'utf8');
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return null;
  try {
    return validateDesign(JSON.parse(json));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Deterministic sky: seed -> PRNG -> stars, constellation, shooting star
// ---------------------------------------------------------------------------

export function skySeed(date: string, place: string): number {
  // FNV-1a over "date|place" — the same moment always yields the same sky.
  const s = `${date}|${place}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Star = { x: number; y: number; r: number; a: number; tinted: boolean };

/** Star coordinates are relative (0..1) to poster width/height. */
export function starField(seed: number, count = 150): Star[] {
  const rng = mulberry32(seed);
  const stars: Star[] = [];
  const moon = moonZone();
  for (let i = 0; i < count; i++) {
    const x = rng();
    const y = rng() * 0.92; // keep the very bottom band calmer
    const r = 0.0009 + rng() * rng() * 0.0034;
    const a = 0.28 + rng() * 0.7;
    // Skip stars that would land on the moon disc (y is a fraction of
    // height; convert to width fraction before measuring).
    const dx = x - moon.cx;
    const dy = (y - moon.cy) * 1.25;
    if (Math.sqrt(dx * dx + dy * dy) < moon.r * 1.25) continue;
    stars.push({ x, y, r, a, tinted: rng() < 0.12 });
  }
  return stars;
}

export const moonZone = () => ({ cx: 0.5, cy: 0.136, r: 0.105 });

export type ConstellationNode = { x: number; y: number };

export function constellation(seed: number): ConstellationNode[] {
  const rng = mulberry32(seed ^ 0x9e3779b9);
  const n = 5 + Math.floor(rng() * 3); // 5..7 nodes
  const nodes: ConstellationNode[] = [];
  for (let i = 0; i < n; i++) {
    const x = (i + 0.5) / n + (rng() - 0.5) * (0.6 / n);
    const y = 0.26 + rng() * 0.3;
    nodes.push({ x: Math.min(0.94, Math.max(0.06, x)), y });
  }
  return nodes;
}

export function shootingStar(seed: number): { x: number; y: number; angle: number; len: number } {
  const rng = mulberry32(seed ^ 0x5bf03635);
  return { x: 0.12 + rng() * 0.6, y: 0.06 + rng() * 0.22, angle: 18 + rng() * 26, len: 0.09 + rng() * 0.06 };
}

// ---------------------------------------------------------------------------
// Moon phase — mean synodic-month approximation, referenced to a known new moon
// (2000-01-06 18:14 UTC). Good to within a few percent of illumination,
// which is what a keepsake needs; an ephemeris would be the production upgrade.
// ---------------------------------------------------------------------------

const SYNODIC_MONTH = 29.530588853;
const NEW_MOON_REF = Date.UTC(2000, 0, 6, 18, 14);

export type MoonPhase = {
  /** 0..1 through the synodic cycle; 0 = new, 0.5 = full */
  phase: number;
  /** 0..1 fraction illuminated */
  illumination: number;
  /** waxing = illuminated on the (northern-hemisphere) right */
  waxing: boolean;
  name: string;
};

export function moonPhase(date: string): MoonPhase {
  const [y, m, d] = date.split('-').map(Number);
  // The night of `date`: evaluate at 23:00 local-ish (UTC) that evening.
  const days = (Date.UTC(y, m - 1, d, 23, 0) - NEW_MOON_REF) / 86400000;
  const phase = (((days % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH) / SYNODIC_MONTH;
  const illumination = (1 - Math.cos(2 * Math.PI * phase)) / 2;
  const names = [
    'New Moon',
    'Waxing Crescent',
    'First Quarter',
    'Waxing Gibbous',
    'Full Moon',
    'Waning Gibbous',
    'Last Quarter',
    'Waning Crescent',
  ];
  const name = names[Math.floor(((phase + 1 / 16) % 1) * 8)];
  return { phase, illumination, waxing: phase < 0.5, name };
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function formatDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return `${String(d).padStart(2, '0')} ${MONTHS[m - 1]} ${y}`;
}

/** Deterministic "night number" shown on the poster — part of the one-of-one feel. */
export function nightNumber(seed: number): number {
  return 1000 + (seed % 8999);
}
