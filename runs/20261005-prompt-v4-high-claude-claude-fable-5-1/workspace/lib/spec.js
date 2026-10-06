// The "design spec" is the complete description of one customer's shirt. It travels
// through Stripe metadata and is the only input the print-file endpoint needs.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { SHIRTS } from '../public/lib/dayprint.js';
import { isValidDate, MIN_DATE, maxDate } from './weather.js';

export const SKU = 'GLOBAL-TEE-BC-3001'; // Bella + Canvas 3001, DTG front print
export const MAX_CAPTION = 36;

function secret() {
  const s = process.env.ART_SIGNING_SECRET;
  if (!s || s.length < 16) throw new Error('ART_SIGNING_SECRET is not configured');
  return s;
}

const b64u = {
  enc: (s) => Buffer.from(s, 'utf8').toString('base64url'),
  dec: (s) => Buffer.from(s, 'base64url').toString('utf8'),
};

/**
 * Validate + normalise an untrusted spec object. Throws a user-facing Error on problems.
 * `forFulfillment` relaxes the sales-time date window: an order placed months ago must
 * still render, so only impossible dates are rejected.
 */
export function validateSpec(input, { forFulfillment = false } = {}) {
  if (!input || typeof input !== 'object') throw new Error('Missing design');
  const p = input.place || {};
  const lat = Number(p.lat), lon = Number(p.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new Error('Pick a place from the suggestions');
  const name = String(p.name || '').trim().slice(0, 60);
  if (!name) throw new Error('Pick a place from the suggestions');
  const date = String(input.date || '');
  if (forFulfillment ? !isRealDate(date) : !isValidDate(date)) {
    throw new Error(`Choose a date between ${MIN_DATE} and ${maxDate()} (the weather archive lags about a week)`);
  }
  const unit = input.unit === 'C' ? 'C' : 'F';
  const shirt = String(input.shirt || '');
  if (!SHIRTS[shirt]) throw new Error('Choose a shirt colour');
  const size = String(input.size || '').toLowerCase();
  if (!SHIRTS[shirt].sizes.includes(size)) throw new Error(`Size ${size.toUpperCase()} is not available in ${SHIRTS[shirt].label}`);
  const caption = String(input.caption || '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_CAPTION);
  return {
    v: 1,
    place: {
      name,
      admin1: String(p.admin1 || '').trim().slice(0, 60),
      country: String(p.country || '').trim().slice(0, 60),
      countryCode: String(p.countryCode || '').trim().slice(0, 2).toUpperCase(),
      lat: Math.round(lat * 10000) / 10000,
      lon: Math.round(lon * 10000) / 10000,
    },
    date,
    unit,
    shirt,
    size,
    caption,
  };
}

function isRealDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s && s >= MIN_DATE && s <= new Date().toISOString().slice(0, 10);
}

export function encodeSpec(spec) {
  return b64u.enc(JSON.stringify(spec));
}
export function decodeSpec(encoded) {
  try {
    return validateSpec(JSON.parse(b64u.dec(encoded)), { forFulfillment: true });
  } catch (e) {
    throw new Error('Invalid design: ' + e.message);
  }
}

export function sign(encoded) {
  return createHmac('sha256', secret()).update(encoded).digest('hex').slice(0, 32);
}
export function verify(encoded, sig) {
  if (typeof sig !== 'string' || sig.length !== 32) return false;
  const a = Buffer.from(sign(encoded)), b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Public, signed URL of the print-ready PNG for a spec. Prodigi downloads this. */
export function artUrl(base, spec, opts = {}) {
  const d = encodeSpec(spec);
  const u = `${base.replace(/\/$/, '')}/art/${d}/${sign(d)}.png`;
  return opts.width ? `${u}?w=${opts.width}` : u;
}

/** Flatten a spec into Stripe metadata (string values, <=500 chars each). */
export function specToMetadata(spec) {
  return {
    dp_v: '1',
    place_name: spec.place.name,
    place_admin1: spec.place.admin1,
    place_country: spec.place.country,
    place_cc: spec.place.countryCode,
    lat: String(spec.place.lat),
    lon: String(spec.place.lon),
    date: spec.date,
    unit: spec.unit,
    shirt: spec.shirt,
    size: spec.size,
    caption: spec.caption,
  };
}
export function specFromMetadata(m) {
  if (!m || m.dp_v !== '1') throw new Error('Session has no Dayprint design metadata');
  return validateSpec({
    place: { name: m.place_name, admin1: m.place_admin1, country: m.place_country, countryCode: m.place_cc, lat: m.lat, lon: m.lon },
    date: m.date, unit: m.unit, shirt: m.shirt, size: m.size, caption: m.caption,
  }, { forFulfillment: true });
}
