// Converts a local wall-clock date/time at a lat/lon into a UTC instant,
// using the IANA zone for that location and Node's full-ICU Intl data.
import tzLookup from 'tz-lookup';

function zoneOffsetMs(zone, date) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: zone, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute, +parts.second);
  return asUtc - date.getTime();
}

export function resolveZone(lat, lon) {
  try {
    return tzLookup(lat, lon);
  } catch {
    return 'UTC';
  }
}

export function localToUtcIso(lat, lon, dateStr, timeStr) {
  const zone = resolveZone(lat, lon);
  const wall = Date.parse(`${dateStr}T${timeStr || '00:00'}:00Z`);
  if (Number.isNaN(wall)) throw new Error('invalid date/time');
  let guess = wall;
  for (let i = 0; i < 4; i++) guess = wall - zoneOffsetMs(zone, new Date(guess));
  return { iso: new Date(guess).toISOString(), zone };
}
