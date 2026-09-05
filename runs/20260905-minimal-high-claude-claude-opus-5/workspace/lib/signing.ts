import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * The artwork endpoint renders arbitrary-resolution PNGs, so URLs are signed:
 * the server mints them, Prodigi and the confirmation screen just fetch them.
 */
function secret(): string {
  return (
    process.env.ARTWORK_SIGNING_SECRET ||
    process.env.STRIPE_SECRET_KEY ||
    'datetime-store-dev-secret'
  );
}

export function signArtwork(ts: number, width: number): string {
  return createHmac('sha256', secret())
    .update(`${ts}:${width}`)
    .digest('hex')
    .slice(0, 32);
}

export function verifyArtwork(ts: number, width: number, sig: string): boolean {
  const expected = Buffer.from(signArtwork(ts, width));
  const actual = Buffer.from(sig || '');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function artworkPath(ts: number, width: number): string {
  return `/api/artwork?ts=${ts}&w=${width}&sig=${signArtwork(ts, width)}`;
}
