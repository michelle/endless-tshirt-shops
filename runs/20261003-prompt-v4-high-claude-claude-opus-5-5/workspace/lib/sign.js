import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const key = () =>
  process.env.PRINT_SIGNING_SECRET || createHash('sha256').update(`print-files:${process.env.STRIPE_SECRET_KEY}`).digest('hex');

export const signId = (id) => createHmac('sha256', key()).update(id).digest('base64url').slice(0, 32);

export function verifyId(id, sig) {
  const a = Buffer.from(signId(id));
  const b = Buffer.from(String(sig));
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Public, unguessable URL Prodigi downloads the print file from. */
export const printUrl = (base, sessionId) => `${base}/print/${sessionId}.${signId(sessionId)}.png`;
