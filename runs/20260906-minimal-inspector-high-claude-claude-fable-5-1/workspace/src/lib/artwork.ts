/**
 * Everything about the artwork that gets printed on the shirt lives here so the
 * on-screen preview and the print-ready file agree on what a shirt looks like.
 *
 * A shirt's artwork is fully determined by one number: the Unix time in
 * milliseconds at the instant the customer pressed "Buy". That number is the
 * design. It is stored in the Stripe PaymentIntent metadata and rendered on
 * demand at /api/artwork/<timestamp>.png for Prodigi to download.
 */

/** Print-ready file dimensions in pixels (matches Prodigi's US front print area for both tees). */
export const PRINT_WIDTH = 2490;
export const PRINT_HEIGHT = 3510;

/** Physical print area these pixels map onto (inches). */
export const PRINT_WIDTH_IN = 12;

/** The number is 8 inches wide and sits 3 inches below the top of the print area, like the original store. */
export const ARTWORK_WIDTH_IN = 8;
export const ARTWORK_TOP_IN = 3;

export const INK_COLOR = "#ffffff";
export const FONT_FAMILY = "Chivo";

/** Oldest timestamp we'll accept as a design (guards against garbage input). Keep generous: someone may sit on the page a while. */
export const MAX_TIMESTAMP_AGE_MS = 24 * 60 * 60 * 1000;
/** Allow a little client clock skew into the future. */
export const MAX_TIMESTAMP_FUTURE_MS = 5 * 60 * 1000;

export function artworkText(timestamp: number): string {
  return String(timestamp);
}

export function isValidTimestamp(value: unknown, now: number = Date.now()): value is number {
  if (typeof value !== "number" || !Number.isInteger(value)) return false;
  if (value < now - MAX_TIMESTAMP_AGE_MS) return false;
  if (value > now + MAX_TIMESTAMP_FUTURE_MS) return false;
  return true;
}

/** Parse "<13 digits>.png" style file names used by the artwork route. */
export function parseArtworkFileName(file: string): number | null {
  const match = /^(\d{10,16})\.png$/.exec(file);
  if (!match) return null;
  const ts = Number(match[1]);
  return Number.isSafeInteger(ts) ? ts : null;
}

export function artworkPath(timestamp: number): string {
  return `/api/artwork/${artworkText(timestamp)}.png`;
}

/** Human readable rendering of the design, used in emails/receipts and the success screen. */
export function describeTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString();
}
