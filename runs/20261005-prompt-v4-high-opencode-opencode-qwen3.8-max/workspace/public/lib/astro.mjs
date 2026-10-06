// Heliogram — solar astronomy engine (pure math, no external data).
// All times are LOCAL SOLAR TIME hours (0..24): solar noon is exactly 12.0,
// so every band is symmetric around noon and the geometry stays clean.
//
// Shared by the browser (live preview) and the server (print rendering).

const DEG = Math.PI / 180;

export const ALTITUDES = {
  bright: 15,   // high sun — brightest gold core
  gold: 6,      // strong daylight
  day: -0.833,  // official sunrise/sunset (refraction + solar radius)
  civil: -6,
  naut: -12,
  astro: -18,
};

/** Julian Day number for a Gregorian calendar date at 0h UT. */
export function julianDay(y, m, d) {
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
}

export function isLeapYear(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export function daysInYear(y) {
  return isLeapYear(y) ? 366 : 365;
}

/** Apparent solar declination in degrees (Meeus, low precision — ~0.01°). */
export function solarDeclination(jd) {
  const T = (jd - 2451545.0) / 36525;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * DEG;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M)
    + (0.019993 - 0.000101 * T) * Math.sin(2 * M)
    + 0.000289 * Math.sin(3 * M);
  const sunLon = L0 + C;
  const omega = (125.04 - 1934.136 * T) * DEG;
  const lambda = (sunLon - 0.00569 - 0.00478 * Math.sin(omega)) * DEG;
  const eps = (23.439291 - 0.0130042 * T + 0.00256 * Math.cos(omega)) * DEG;
  return Math.asin(Math.sin(eps) * Math.sin(lambda)) / DEG;
}

/**
 * Half-day length in hours for which the sun stays above `altDeg`.
 * Returns { hours, alwaysUp, alwaysDown }.
 */
export function hourAngleHours(latDeg, decDeg, altDeg) {
  const lat = latDeg * DEG;
  const dec = decDeg * DEG;
  const alt = altDeg * DEG;
  const cosLat = Math.cos(lat);
  if (Math.abs(cosLat) < 1e-9) {
    // At the poles the sun circles at constant altitude.
    return dec > alt
      ? { hours: 12, alwaysUp: true, alwaysDown: false }
      : { hours: 0, alwaysUp: false, alwaysDown: true };
  }
  const cosH = (Math.sin(alt) - Math.sin(lat) * Math.sin(dec)) / (cosLat * Math.cos(dec));
  if (cosH >= 1) return { hours: 0, alwaysUp: false, alwaysDown: true };
  if (cosH <= -1) return { hours: 12, alwaysUp: true, alwaysDown: false };
  return { hours: Math.acos(cosH) / DEG / 15, alwaysUp: false, alwaysDown: false };
}

/**
 * For one day-of-year at (lat, lon): the solar-time window [from, to] during
 * which the sun is above each threshold altitude, clamped to [0, 24].
 * A window is null when the sun never reaches that altitude that day.
 * Windows of 0..24 mean "all day" (midnight sun).
 */
export function dayBands(doy, year, lat, lon) {
  const noonUT = julianDay(year, 1, 1) + (doy - 1) + 0.5 - (lon || 0) / 360;
  const dec = solarDeclination(noonUT);
  const out = {};
  for (const [name, alt] of Object.entries(ALTITUDES)) {
    const ha = hourAngleHours(lat, dec, alt);
    if (ha.alwaysDown) { out[name] = null; continue; }
    if (ha.alwaysUp) { out[name] = [0, 24]; continue; }
    out[name] = [12 - ha.hours, 12 + ha.hours];
  }
  return out;
}

/**
 * Full-year table of bands plus derived stats for captions.
 * @returns {{ days: Array, longest: object, shortest: object, midnightSun: object|null, polarNight: object|null, doyOfSolstice: object }}
 */
export function yearTable(year, lat, lon) {
  const n = daysInYear(year);
  const days = [];
  for (let doy = 1; doy <= n; doy++) days.push(dayBands(doy, year, lat, lon));

  const lengthOf = (b) => (b ? b[1] - b[0] : 0);
  let maxLen = -1, minLen = 99, maxDoy = 1, minDoy = 1;
  for (let doy = 1; doy <= n; doy++) {
    const len = lengthOf(days[doy - 1].day);
    if (len > maxLen) { maxLen = len; maxDoy = doy; }
    if (len < minLen) { minLen = len; minDoy = doy; }
  }

  const runAround = (pred) => {
    // find the longest contiguous run of days satisfying pred (wrapping the year)
    let best = null;
    for (let start = 1; start <= n; start++) {
      if (!pred(start)) continue;
      if (pred(start - 1 < 1 ? n : start - 1)) continue; // not a run start
      let len = 0;
      while (pred(((start - 1 + len) % n) + 1) && len <= n) len++;
      if (!best || len > best.len) best = { len, start, end: ((start - 1 + len - 1) % n) + 1 };
    }
    return best;
  };
  const msRun = runAround((d) => lengthOf(days[d - 1].day) >= 23.999);
  const pnRun = runAround((d) => days[d - 1].day === null);

  // solstices/equinoxes (approximate doys, fine for markers)
  const solsticeJune = isLeapYear(year) ? 172 : 172;
  const solsticeDec = isLeapYear(year) ? 356 : 355;
  const equinoxMar = isLeapYear(year) ? 79 : 79;
  const equinoxSep = isLeapYear(year) ? 265 : 265;

  return {
    days,
    count: n,
    longest: { hours: maxLen, doy: maxDoy },
    shortest: { hours: minLen, doy: minDoy },
    midnightSun: msRun,
    polarNight: pnRun,
    marks: { junSolstice: solsticeJune, decSolstice: solsticeDec, marEquinox: equinoxMar, sepEquinox: equinoxSep },
  };
}

/** Day-of-year (1-based) for a month/day in the given year. Feb 29 → Mar 1 on common years. */
export function doyOfMonthDay(md, year) {
  const [m, d] = md.split('-').map(Number);
  const cum = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let doy = cum[m - 1] + d;
  if (m > 2 && isLeapYear(year)) doy += 1;
  if (m === 2 && d === 29 && !isLeapYear(year)) doy = 60; // treat as Mar 1 boundary
  return Math.min(Math.max(doy, 1), daysInYear(year));
}

/** Cumulative day index (0-based) at the start of each month, for the month ring. */
export function monthStarts(year) {
  const lengths = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const starts = [];
  let acc = 0;
  for (const L of lengths) { starts.push(acc); acc += L; }
  return { starts, lengths, total: acc };
}

export const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** "16H 09M" */
export function formatHM(hours) {
  const h = Math.floor(hours + 1e-9);
  const m = Math.round((hours - h) * 60);
  if (m === 60) return `${h + 1}H 00M`;
  return `${h}H ${String(m).padStart(2, '0')}M`;
}

/** Solar-time hours (e.g. 3.92) → "03:55" */
export function formatClock(hours) {
  let h = Math.floor(hours + 1e-9);
  let m = Math.round((hours - h) * 60);
  if (m === 60) { h += 1; m = 0; }
  return `${String(h % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** 48.8566 → "48.86° N" */
export function formatLat(lat) {
  return `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}`;
}

export function formatLon(lon) {
  return `${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? 'E' : 'W'}`;
}

/** Month-day label for a doy. */
export function monthDayOfDoy(doy, year) {
  const lengths = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let d = doy;
  for (let m = 0; m < 12; m++) {
    if (d <= lengths[m]) return `${MONTH_NAMES[m]} ${d}`;
    d -= lengths[m];
  }
  return `DEC 31`;
}
