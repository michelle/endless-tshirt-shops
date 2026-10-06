// Compact, signed encoding of a design so it can travel through Stripe metadata and
// be fetched by Prodigi as a print-file URL without needing a database.
import crypto from 'node:crypto';
import { env } from './config.js';

const KEYS = ['lat', 'lon', 't', 'headline', 'place', 'dateLine', 'coords', 'ink', 'lines', 'names', 'planets', 'ecliptic'];

export function encodeDesign(design) {
  return Buffer.from(JSON.stringify(KEYS.map((k) => design[k]))).toString('base64url');
}

export function decodeDesign(token) {
  const arr = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
  if (!Array.isArray(arr) || arr.length !== KEYS.length) throw new Error('Bad design token');
  return Object.fromEntries(KEYS.map((k, i) => [k, arr[i]]));
}

export function sign(token) {
  return crypto.createHmac('sha256', env('ART_SIGNING_SECRET')).update(token).digest('hex').slice(0, 40);
}

export function verify(token, sig) {
  const expected = sign(token);
  return typeof sig === 'string' && sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

export function printUrl(base, token, extra = '') {
  return `${base}/api/print?d=${token}&s=${sign(token)}${extra}`;
}

// Stripe metadata values are limited to 500 chars: split the token across keys.
export function toMetadata(token) {
  const md = {};
  for (let i = 0; i * 480 < token.length; i++) md[`design_${i}`] = token.slice(i * 480, (i + 1) * 480);
  return md;
}

export function fromMetadata(md) {
  let token = '';
  for (let i = 0; md[`design_${i}`]; i++) token += md[`design_${i}`];
  if (!token) throw new Error('No design in metadata');
  return token;
}
