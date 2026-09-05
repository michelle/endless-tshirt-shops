/** Timestamp validation + friendly formatting. */

export const TS_MIN = 1_000_000_000_000; // 2001-09-09: the first 13-digit millisecond
export const TS_MAX = 9_999_999_999_999; // 2286-11-20: the last one

export function isPlausibleTs(ts: unknown): ts is number {
  return typeof ts === "number" && Number.isInteger(ts) && ts >= TS_MIN && ts <= TS_MAX;
}

/**
 * The moment a buyer freezes on their screen is the moment they get, as long
 * as it's honest: within ten minutes of the server clock and not in the future.
 */
export function reconcileMoment(clientTs: unknown, now = Date.now()): number {
  if (!isPlausibleTs(clientTs)) return now;
  const drift = now - clientTs;
  if (drift < -60_000 || drift > 10 * 60_000) return now;
  return clientTs;
}

export function parseTs(raw: string | null | undefined): number | null {
  if (!raw) return null;
  if (!/^\d{13}$/.test(raw)) return null;
  const n = Number(raw);
  return isPlausibleTs(n) ? n : null;
}

export function utcString(ts: number): string {
  return new Date(ts).toISOString().replace("T", " ").replace("Z", " UTC");
}
