// HMAC-signed, deterministic artwork URLs. Prodigi fetches the print file from
// here; nothing is stored, and a tampered spec is rejected.
import { createHmac, timingSafeEqual } from 'node:crypto';

export function artSign(spec) {
  const secret = process.env.ART_SIGNING_SECRET;
  if (!secret) throw new Error('ART_SIGNING_SECRET is not configured');
  return createHmac('sha256', secret).update(JSON.stringify(spec)).digest('hex').slice(0, 32);
}

export function verifySpec(spec, sig) {
  const expected = artSign(spec);
  const a = Buffer.from(expected);
  const b = Buffer.from(String(sig || ''));
  return a.length === b.length && timingSafeEqual(a, b);
}

export const b64 = {
  encode(obj) { return Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url'); },
  decode(str) { return JSON.parse(Buffer.from(String(str), 'base64url').toString('utf8')); },
};
