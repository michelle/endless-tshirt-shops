// Client-side wall-clock -> UTC conversion using the IANA tz database built
// into the browser's Intl. The server never needs timezones: the browser
// computes the instant (epoch ms) and the artwork is deterministic from it.

// Offset of `tz` at `utcMs`, derived by formatting the instant in the zone.
function tzOffsetMs(tz, utcMs) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const parts = Object.fromEntries(dtf.formatToParts(new Date(utcMs)).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute, +parts.second);
  return asUtc - utcMs;
}

// Wall time (y,m,d,h,mi) in zone `tz` -> UTC epoch ms. One refinement pass
// handles DST boundaries.
export function zonedToUtcMs(y, m, d, h, mi, tz) {
  const guess = Date.UTC(y, m - 1, d, h, mi);
  let off = tzOffsetMs(tz, guess);
  let utc = guess - off;
  const off2 = tzOffsetMs(tz, utc);
  if (off2 !== off) utc = guess - off2;
  return utc;
}

export function formatWhen(utcMs, tz) {
  const d = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, month: 'long', day: 'numeric', year: 'numeric',
  }).format(new Date(utcMs));
  const t = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(new Date(utcMs));
  return `${d} · ${t}`;
}

export function formatCoords(lat, lng) {
  const la = `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}`;
  const lo = `${Math.abs(lng).toFixed(2)}° ${lng >= 0 ? 'E' : 'W'}`;
  return `${la} · ${lo}`;
}
