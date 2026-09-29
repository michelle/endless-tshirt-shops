// Convert a wall-clock time expressed in an IANA timezone to a UTC instant.
// Works in both browser and Node (full-ICU Node 20).

export function tzOffsetMinutes(tz: string, utcMs: number): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts: Record<string, string> = {};
  for (const pp of dtf.formatToParts(new Date(utcMs))) parts[pp.type] = pp.value;
  const asUTC = Date.UTC(
    +parts.year,
    +parts.month - 1,
    +parts.day,
    +parts.hour === 24 ? 0 : +parts.hour,
    +parts.minute,
    +parts.second
  );
  return Math.round((asUTC - utcMs) / 60000);
}

/** "2021-12-24T23:45" (wall time in `tz`) -> unix ms UTC. Refines the offset guess once. */
export function zonedTimeToUtc(localIso: string, tz: string): number {
  const localMs = Date.parse(localIso + ":00Z"); // treat the wall time as if UTC
  if (Number.isNaN(localMs)) throw new Error("Invalid local time");
  const off1 = tzOffsetMinutes(tz, localMs);
  const utc = localMs - off1 * 60000;
  const off2 = tzOffsetMinutes(tz, utc);
  return localMs - off2 * 60000;
}

export function isValidTz(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz.length <= 64;
  } catch {
    return false;
  }
}
