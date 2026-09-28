// Server-only helpers: compact signed tokens carrying design/order payloads.
// The signed design token doubles as the URL for the print-ready artwork
// endpoint that Prodigi downloads — signing prevents anyone from using our
// render farm for arbitrary payloads.

import { createHmac, timingSafeEqual } from 'node:crypto';

function secret(): string {
  return (
    process.env.ARTWORK_SECRET ||
    (process.env.PRODIGI_API_KEY ? `nightloom::${process.env.PRODIGI_API_KEY}` : 'nightloom-dev-secret')
  );
}

export function pack(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url');
}

export function unpack<T>(packed: string): T | null {
  try {
    return JSON.parse(Buffer.from(packed, 'base64url').toString('utf8')) as T;
  } catch {
    return null;
  }
}

export function sign(packed: string): string {
  return createHmac('sha256', secret()).update(packed).digest('hex').slice(0, 32);
}

export function verify(packed: string, sig: string): boolean {
  if (!packed || !sig) return false;
  const expected = Buffer.from(sign(packed), 'utf8');
  const got = Buffer.from(sig.slice(0, 32), 'utf8');
  if (expected.length !== got.length) return false;
  return timingSafeEqual(expected, got);
}
