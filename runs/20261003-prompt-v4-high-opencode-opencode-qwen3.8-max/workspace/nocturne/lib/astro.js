// NOCTURNE astronomy core.
// Computes the real horizontal-coordinate sky (stars, Milky Way band, moon phase)
// for a given instant and location. Formulas: Meeus, "Astronomical Algorithms".
'use strict';

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

const sin = (x) => Math.sin(x * D2R);
const cos = (x) => Math.cos(x * D2R);
const tan = (x) => Math.tan(x * D2R);
const asin = (x) => Math.asin(x) * R2D;
const atan2d = (y, x) => Math.atan2(y, x) * R2D;
const norm360 = (x) => ((x % 360) + 360) % 360;

// Julian Date from a JS Date (UTC-based)
function julianDate(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

// Greenwich Mean Sidereal Time in degrees (IAU 1982)
function gmst(jd) {
  const T = (jd - 2451545.0) / 36525;
  let g =
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    0.000387933 * T * T -
    (T * T * T) / 38710000;
  return norm360(g);
}

// Local sidereal time (deg) for longitude in degrees EAST
function localSiderealTime(jd, lngDeg) {
  return norm360(gmst(jd) + lngDeg);
}

// Equatorial (ra/dec deg) -> horizontal (alt/az deg; az measured from North, eastward)
function equatorialToHorizontal(raDeg, decDeg, lstDeg, latDeg) {
  const H = norm360(lstDeg - raDeg); // hour angle, deg
  const sinAlt = sin(latDeg) * sin(decDeg) + cos(latDeg) * cos(decDeg) * cos(H);
  const alt = asin(Math.max(-1, Math.min(1, sinAlt)));
  // Meeus eq. 13.3 gives azimuth A from SOUTH, westward positive:
  //   A = atan2(sin H, cos H·sin φ − tan δ·cos φ)
  // With y = sin H·cos δ and x = cos φ·sin δ − sin φ·cos δ·cos H (= −cos δ·(cos H sin φ − tan δ cos φ)),
  // atan2(y, x) = 180° − A, so azimuth from NORTH (eastward positive) is −atan2(y, x) mod 360.
  const y = sin(H) * cos(decDeg);
  const x = cos(latDeg) * sin(decDeg) - sin(latDeg) * cos(decDeg) * cos(H);
  const az = norm360(-atan2d(y, x));
  return { alt, az };
}

// Galactic (l, b deg) -> equatorial (ra, dec deg), J2000
// North Galactic Pole: ra 192.85948, dec 27.12825; l of NCP: 122.93192
const RA_NGP = 192.85948;
const DEC_NGP = 27.12825;
const L_NCP = 122.93192;

function galacticToEquatorial(lDeg, bDeg) {
  const sb = sin(bDeg);
  const cb = cos(bDeg);
  const dl = L_NCP - lDeg;
  const dec = asin(sb * sin(DEC_NGP) + cb * cos(DEC_NGP) * cos(dl));
  const y = cb * sin(dl);
  const x = sb * cos(DEC_NGP) - cb * sin(DEC_NGP) * cos(dl);
  const ra = norm360(RA_NGP + atan2d(y, x));
  return { ra, dec };
}

// Low-precision solar position (Meeus ch. 25): equatorial coords accurate to ~0.01°.
function solarEquatorial(date) {
  const jd = julianDate(date);
  const T = (jd - 2451545.0) / 36525;
  const L0 = norm360(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * sin(M) +
    (0.019993 - 0.000101 * T) * sin(2 * M) +
    0.000289 * sin(3 * M);
  const lon = norm360(L0 + C);
  const eps = 23.439291 - 0.0130042 * T; // obliquity of the ecliptic
  const ra = norm360(atan2d(cos(eps) * sin(lon), cos(lon)));
  const dec = asin(sin(eps) * sin(lon));
  return { ra, dec };
}

// Moon phase using low-precision solar/lunar longitudes (Meeus, Astronomical Algorithms ch. 47–49).
// Accuracy ~0.1° in elongation — far beyond what a phase icon needs.
function moonPhase(date) {
  const jd = julianDate(date);
  const T = (jd - 2451545.0) / 36525;
  // Sun's apparent longitude (low precision)
  const L0 = norm360(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * sin(M) +
    (0.019993 - 0.000101 * T) * sin(2 * M) +
    0.000289 * sin(3 * M);
  const sunLon = norm360(L0 + C);
  // Moon's geocentric longitude, principal periodic terms
  const Lp = norm360(218.3164477 + 481267.88123421 * T - 0.0015786 * T * T);
  const D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T * T;
  const Mm = 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T;
  const F = 93.2720950 + 483202.0175233 * T - 0.0036539 * T * T;
  const lon = norm360(
    Lp +
      6.288774 * sin(Mm) +
      1.274027 * sin(2 * D - Mm) +
      0.658314 * sin(2 * D) +
      0.213618 * sin(2 * Mm) -
      0.185116 * sin(M) -
      0.114332 * sin(2 * F) +
      0.058793 * sin(2 * D - 2 * Mm) +
      0.057066 * sin(2 * D - M - Mm) +
      0.053322 * sin(2 * D + Mm) +
      0.057066 * sin(2 * D - M)
  );
  // Phase angle (Meeus eq. 48.3): i = 180° − D − (principal corrections)
  const i = norm360(
    180 -
      D -
      6.288774 * sin(Mm) +
      1.274027 * sin(2 * D - Mm) +
      0.658314 * sin(2 * D) +
      0.213618 * sin(2 * Mm) -
      0.185116 * sin(M) -
      0.114332 * sin(2 * F)
  );
  const illuminated = (1 + cos(i)) / 2;
  // Synodic phase 0..1 from true elongation (moon east of sun): 0=new, 0.5=full
  const phase = norm360(lon - sunLon) / 360;
  return { phase, illuminated };
}

const PHASE_NAMES = [
  [0.02, 'New Moon'],
  [0.23, 'Waxing Crescent'],
  [0.27, 'First Quarter'],
  [0.48, 'Waxing Gibbous'],
  [0.52, 'Full Moon'],
  [0.73, 'Waning Gibbous'],
  [0.77, 'Last Quarter'],
  [0.98, 'Waning Crescent'],
  [1.01, 'New Moon'],
];

function moonPhaseName(phase) {
  for (const [upto, name] of PHASE_NAMES) if (phase < upto) return name;
  return 'New Moon';
}

// Compute everything needed to draw the sky for a design.
// opts: { date: Date, lat: number (N+), lng: number (E+), horizonDeg?: number }
// Returns stars in azimuthal-equidistant projection centered on zenith, in unit-disc coords
// (x,y in [-1,1], north up, east left — the standard "looking up" star chart orientation),
// plus milkyWay polyline segments and moon info.
function computeSky(opts) {
  const { date, lat, lng } = opts;
  const horizon = opts.horizonDeg !== undefined ? opts.horizonDeg : 2; // small margin below horizon
  const jd = julianDate(date);
  const lst = localSiderealTime(jd, lng);

  const catalog = require('./catalog.json');
  const stars = [];
  for (const [ra, dec, mag, ci] of catalog.stars) {
    const { alt, az } = equatorialToHorizontal(ra, dec, lst, lat);
    if (alt < horizon) continue;
    // Azimuthal equidistant projection centered on zenith: r = (90° − alt)/90°.
    // Orientation: north at top, east to the LEFT (standard "looking up" star chart).
    const r = (90 - alt) / 90;
    stars.push({ x: -r * sin(az), y: -r * cos(az), mag, ci });
  }

  // Milky Way: sample galactic equator (b = 0), project; keep above-horizon runs.
  const galacticRuns = [];
  let run = null;
  for (let l = 0; l <= 360.0001; l += 0.5) {
    const { ra, dec } = galacticToEquatorial(l, 0);
    const { alt, az } = equatorialToHorizontal(ra, dec, lst, lat);
    if (alt >= horizon) {
      const r = (90 - alt) / 90;
      const pt = { x: -r * sin(az), y: -r * cos(az), l };
      if (!run) { run = []; galacticRuns.push(run); }
      run.push(pt);
    } else {
      run = null;
    }
  }

  const moon = moonPhase(date);
  moon.name = moonPhaseName(moon.phase);
  const sunEq = solarEquatorial(date);
  const sun = equatorialToHorizontal(sunEq.ra, sunEq.dec, lst, lat);
  return { stars, galacticRuns, moon, sun, lst };
}

module.exports = {
  julianDate,
  gmst,
  localSiderealTime,
  equatorialToHorizontal,
  galacticToEquatorial,
  solarEquatorial,
  moonPhase,
  moonPhaseName,
  computeSky,
};
