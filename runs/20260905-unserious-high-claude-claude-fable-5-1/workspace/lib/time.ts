/** Shared helpers for talking about the one thing we sell. */

export function isPlausibleTimestamp(n: unknown): n is number {
  return (
    typeof n === "number" &&
    Number.isInteger(n) &&
    n >= 0 &&
    n <= 99_999_999_999_999 // year 5138. We'll revisit.
  );
}

export function parseTimestamp(raw: string): number | null {
  const cleaned = raw.replace(/\.png$/i, "");
  if (!/^\d{1,14}$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return isPlausibleTimestamp(n) ? n : null;
}

/** "Sep 5, 2026, 21:57:03.412 UTC" */
export function describeTimestamp(ts: number): string {
  const d = new Date(ts);
  const date = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "UTC",
  });
  const ms = String(d.getUTCMilliseconds()).padStart(3, "0");
  return `${date}, ${time}.${ms} UTC`;
}

export function millisecondsAgo(ts: number, now = Date.now()): string {
  const diff = Math.max(0, now - ts);
  return diff.toLocaleString("en-US");
}
