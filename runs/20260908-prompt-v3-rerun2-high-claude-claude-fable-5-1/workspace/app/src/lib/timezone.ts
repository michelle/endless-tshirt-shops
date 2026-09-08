// Convert a wall-clock date/time in an IANA timezone to a UTC timestamp using
// only the Intl API (no timezone database dependency).

function tzOffsetMs(ms: number, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts: Record<string, number> = {};
  for (const p of dtf.formatToParts(new Date(ms))) {
    if (p.type !== "literal") parts[p.type] = Number(p.value);
  }
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour % 24, parts.minute, parts.second);
  return asUtc - ms;
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** `date` = YYYY-MM-DD, `time` = HH:MM (local wall clock in `timeZone`). Returns unix ms. */
export function zonedTimeToUtc(date: string, time: string, timeZone: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const naive = Date.UTC(y, m - 1, d, hh, mm, 0);
  const offset1 = tzOffsetMs(naive, timeZone);
  let guess = naive - offset1;
  const offset2 = tzOffsetMs(guess, timeZone);
  if (offset2 !== offset1) guess = naive - offset2;
  return guess;
}
