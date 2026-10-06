// HMAC-signed design tokens: encode all print-design params in a URL-safe,
// tamper-proof token so the PNG endpoint can be public without a database.
import { createHmac, timingSafeEqual } from 'node:crypto';

const b64u = (buf) => Buffer.from(buf).toString('base64url');

export function signParams(params, secret) {
  const payload = b64u(JSON.stringify(params));
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyToken(token, secret) {
  const i = token.lastIndexOf('.');
  if (i <= 0) return null;
  const payload = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expected = createHmac('sha256', secret).update(payload).digest();
  let got;
  try { got = Buffer.from(sig, 'base64url'); } catch { return null; }
  if (got.length !== expected.length || !timingSafeEqual(got, expected)) return null;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}
