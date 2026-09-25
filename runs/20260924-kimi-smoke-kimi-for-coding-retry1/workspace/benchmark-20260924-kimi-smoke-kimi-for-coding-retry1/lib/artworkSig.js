// HMAC signing for stateless artwork URLs.
// The artwork route regenerates the exact print PNG from signed design params,
// so Prodigi can fetch it from the app itself without any file storage.

import crypto from 'crypto';

let fallbackSecret = null;

function secret() {
  if (process.env.APP_SECRET) return process.env.APP_SECRET;
  if (!fallbackSecret) fallbackSecret = crypto.randomBytes(32).toString('hex');
  return fallbackSecret;
}

function b64u(buf) {
  return Buffer.from(buf).toString('base64url');
}

export function signPayload(obj) {
  const body = b64u(JSON.stringify(obj));
  const sig = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyPayload(token) {
  if (typeof token !== 'string' || token.length > 4096) return null;
  const dot = token.lastIndexOf('.');
  if (dot < 1) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}
