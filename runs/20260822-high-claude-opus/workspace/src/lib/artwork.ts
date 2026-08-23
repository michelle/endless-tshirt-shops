/**
 * Print artwork.
 *
 * The shirt's artwork is the epoch millisecond, frozen at the instant the
 * customer commits to buying. The browser renders it once at print resolution
 * and hands the PNG to the server, which validates it before uploading to
 * Scalable Press.
 */

/** Printed width on the garment, in inches. */
export const PRINT_WIDTH_INCHES = 8;
/** Target print resolution. 300 DPI is the floor for crisp DTG output. */
const DPI = 300;

export const ARTWORK_WIDTH_PX = PRINT_WIDTH_INCHES * DPI; // 2400
export const ARTWORK_HEIGHT_PX = 560;

export const ARTWORK_MAX_BYTES = 6 * 1024 * 1024;
/** Reject anything too small to print well. */
export const ARTWORK_MIN_WIDTH_PX = 1200;

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const DATA_URL_PREFIX = 'data:image/png;base64,';

export type ArtworkValidation =
  | { ok: true; buffer: Buffer; width: number; height: number }
  | { ok: false; error: string };

/**
 * Decode and sanity-check a client-supplied artwork data URL: real PNG, plausible
 * print dimensions, and not large enough to be an upload attack.
 */
export function decodeArtwork(dataUrl: unknown): ArtworkValidation {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith(DATA_URL_PREFIX)) {
    return { ok: false, error: 'Artwork must be a base64 PNG data URL.' };
  }

  const base64 = dataUrl.slice(DATA_URL_PREFIX.length);
  // 4 base64 chars per 3 bytes; bail before allocating anything huge.
  if (base64.length > (ARTWORK_MAX_BYTES / 3) * 4) {
    return { ok: false, error: 'Artwork is too large.' };
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64, 'base64');
  } catch {
    return { ok: false, error: 'Artwork is not valid base64.' };
  }

  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return { ok: false, error: 'Artwork is not a PNG.' };
  }
  if (buffer.length > ARTWORK_MAX_BYTES) {
    return { ok: false, error: 'Artwork is too large.' };
  }

  // IHDR is always the first chunk: 8 byte signature, 4 byte length, 4 byte
  // type, then width and height as big-endian uint32s.
  if (buffer.subarray(12, 16).toString('ascii') !== 'IHDR') {
    return { ok: false, error: 'Artwork PNG is malformed.' };
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);

  if (width < ARTWORK_MIN_WIDTH_PX) {
    return {
      ok: false,
      error: `Artwork must be at least ${ARTWORK_MIN_WIDTH_PX}px wide to print.`,
    };
  }
  if (height < 1 || height > width) {
    return { ok: false, error: 'Artwork proportions are wrong.' };
  }

  return { ok: true, buffer, width, height };
}

/**
 * How far a client-claimed timestamp may drift from the server clock. Generous
 * enough for a slow checkout and a skewed device clock, tight enough that the
 * printed number is honestly "when you bought it".
 */
const MAX_FUTURE_DRIFT_MS = 5 * 60 * 1000;
const MAX_PAST_DRIFT_MS = 6 * 60 * 60 * 1000;

export function isPlausibleTimestamp(epochMs: number, now: number): boolean {
  if (!Number.isSafeInteger(epochMs) || epochMs <= 0) return false;
  return epochMs < now + MAX_FUTURE_DRIFT_MS && epochMs > now - MAX_PAST_DRIFT_MS;
}

/** Human-readable rendering of the moment printed on the shirt. */
export function describeTimestamp(epochMs: number): string {
  return new Date(epochMs).toISOString().replace('T', ' ').replace('Z', ' UTC');
}
