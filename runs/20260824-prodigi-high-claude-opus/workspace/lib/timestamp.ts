/**
 * The product is a number: Unix epoch milliseconds, exactly as the original
 * store printed it (`new Date().getTime()`).
 */

/** Sanity window for a purchasable timestamp: 2001-09-09 .. year 2286. */
const MIN_TIMESTAMP = 1_000_000_000_000;
const MAX_TIMESTAMP = 9_999_999_999_999;

/** How far a client-supplied timestamp may drift from server time. */
export const TIMESTAMP_TOLERANCE_MS = 10 * 60 * 1000;

export function isValidTimestamp(ms: unknown): ms is number {
  return (
    typeof ms === 'number' &&
    Number.isInteger(ms) &&
    ms >= MIN_TIMESTAMP &&
    ms <= MAX_TIMESTAMP
  );
}

/**
 * Clients tell us which millisecond they bought, because that is the moment
 * they clicked. We only accept timestamps near our own clock so the printed
 * number is honest.
 */
export function coerceTimestamp(ms: unknown, now = Date.now()): number {
  if (isValidTimestamp(ms) && Math.abs(now - ms) <= TIMESTAMP_TOLERANCE_MS) {
    return ms;
  }
  return now;
}

/** Human-readable rendering of a shirt's timestamp, in UTC. */
export function describeTimestamp(ms: number): string {
  return `${new Date(ms).toISOString().replace('T', ' ').replace('Z', '')} UTC`;
}
