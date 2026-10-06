// Resolves the customer's chosen moment (local wall-clock date/time at a place)
// into a UTC instant, using the IANA timezone for the coordinates (offline lookup).
const { DateTime } = require('luxon');
const tzlookup = require('tz-lookup');

function zoneForLatLon(lat, lon) {
  try {
    const zone = tzlookup(lat, lon);
    if (zone && DateTime.now().setZone(zone).isValid) return { zone, kind: 'iana' };
  } catch (_) { /* fall through */ }
  // Oceans / poles: fixed offset from longitude (rounded to nearest hour)
  const offsetH = Math.round(lon / 15);
  const sign = offsetH < 0 ? '-' : '+';
  const zone = `UTC${sign}${String(Math.abs(offsetH)).padStart(2, '0')}:00`;
  return { zone, kind: 'offset' };
}

/**
 * @param {string} dateStr 'YYYY-MM-DD'
 * @param {string} timeStr 'HH:mm' (24h)
 * @param {number} lat @param {number} lon
 * @returns {{utcDate: Date, zone: string, zoneKind: string, local: string,
 *            dateLong: string, time12: string, isoLocal: string}}
 */
function resolveMoment(dateStr, timeStr, lat, lon) {
  const { zone, kind } = zoneForLatLon(lat, lon);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || '');
  const t = /^(\d{1,2}):(\d{2})$/.exec(timeStr || '');
  if (!m || !t) throw new Error('invalid date/time');
  const dt = DateTime.fromObject(
    { year: +m[1], month: +m[2], day: +m[3], hour: +t[1], minute: +t[2] },
    { zone }
  );
  if (!dt.isValid) throw new Error(`invalid moment: ${dt.invalidExplanation}`);
  if (dt.year < 1900 || dt > DateTime.now().plus({ days: 1 })) {
    throw new Error('moment out of supported range (1900 .. now+1d)');
  }
  return {
    utcDate: dt.toUTC().toJSDate(),
    zone,
    zoneKind: kind,
    isoLocal: dt.toFormat("yyyy-MM-dd'T'HH:mm"),
    dateLong: dt.toFormat('LLLL d, yyyy'),   // e.g. March 14, 2001
    time12: dt.toFormat('h:mm a'),           // e.g. 9:42 PM
  };
}

function formatCoords(lat, lon) {
  const latStr = `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? 'E' : 'W'}`;
  return `${latStr} · ${lonStr}`;
}

module.exports = { resolveMoment, zoneForLatLon, formatCoords };
