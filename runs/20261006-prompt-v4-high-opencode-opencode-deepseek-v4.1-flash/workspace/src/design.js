// Design tokens: compact, signed descriptions of a customer's one-of-one
// soundprint. The same token drives the live preview, the print-ready asset
// that Prodigi downloads, and the order record.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR, ensureDirs } from './config.js';
import { THEMES, GARMENTS, SIZES } from './brand.js';

const SECRET_FILE = path.join(DATA_DIR, 'design-secret.key');

function secret() {
  ensureDirs();
  if (!fs.existsSync(SECRET_FILE)) {
    fs.writeFileSync(SECRET_FILE, crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
  }
  return fs.readFileSync(SECRET_FILE, 'utf8').trim();
}

function b64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

function sign(payloadB64) {
  return crypto.createHmac('sha256', secret()).update(payloadB64).digest('base64url');
}

function clampStr(s, max) {
  return String(s == null ? '' : s)
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

export function hashSerial(seed) {
  const h = crypto.createHash('sha256').update(seed).digest();
  const n = (h[0] << 16) | (h[1] << 8) | h[2];
  return n.toString(36).toUpperCase().padStart(6, '0').slice(-6);
}

// Normalise untrusted input into a safe, canonical design object.
export function normalizeDesign(input = {}) {
  const message = clampStr(input.message, 90) || 'Always look up';
  const dedication = clampStr(input.dedication, 60);
  const theme = THEMES[input.theme] ? input.theme : (GARMENTS[input.garment]?.defaultTheme || 'signal');
  const garment = GARMENTS[input.garment] ? input.garment : 'black';
  const size = SIZES.includes(input.size) ? input.size : 'm';
  const variant = Math.abs(parseInt(input.variant, 10) || 0) % 24;
  const serial = hashSerial(`${message}|${dedication}|${theme}|${variant}`);
  return { message, dedication, theme, garment, size, variant, serial };
}

export function encodeToken(design) {
  const d = normalizeDesign(design);
  const payload = b64url(
    JSON.stringify({
      m: d.message,
      d: d.dedication,
      t: d.theme,
      g: d.garment,
      s: d.size,
      v: d.variant,
      n: d.serial,
    })
  );
  return `${payload}.${sign(payload)}`;
}

export function decodeToken(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const j = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return normalizeDesign({
      message: j.m,
      dedication: j.d,
      theme: j.t,
      garment: j.g,
      size: j.s,
      variant: j.v,
    });
  } catch {
    return null;
  }
}
