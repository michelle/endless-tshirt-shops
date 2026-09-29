// Astronomy primitives: Julian dates, sidereal time, precession, coordinate
// transforms, and low-precision Sun/Moon positions (Meeus, Astronomical
// Algorithms). Accuracy is ~0.01° for the Sun and ~0.3° for the Moon, far
// beyond what a decorative star chart needs.

export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;

export function julianDate(ms: number): number {
  return ms / 86400000 + 2440587.5;
}

/** Greenwich mean sidereal time in degrees (IAU 1982). */
export function gmstDegrees(jd: number): number {
  const d = jd - 2451545.0;
  const t = d / 36525;
  let g =
    280.46061837 +
    360.98564736629 * d +
    0.000387933 * t * t -
    (t * t * t) / 38710000;
  g %= 360;
  return g < 0 ? g + 360 : g;
}

/** Local sidereal time in degrees. lon: east-positive degrees. */
export function lstDegrees(jd: number, lonDeg: number): number {
  let l = gmstDegrees(jd) + lonDeg;
  l %= 360;
  return l < 0 ? l + 360 : l;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Unit vector from RA/Dec (degrees, any equinox). */
export function eqToVec(raDeg: number, decDeg: number): Vec3 {
  const ra = raDeg * DEG;
  const dec = decDeg * DEG;
  const cd = Math.cos(dec);
  return { x: cd * Math.cos(ra), y: cd * Math.sin(ra), z: Math.sin(dec) };
}

export function vecToEq(v: Vec3): { ra: number; dec: number } {
  let ra = Math.atan2(v.y, v.x) * RAD;
  if (ra < 0) ra += 360;
  return { ra, dec: Math.asin(Math.max(-1, Math.min(1, v.z))) * RAD };
}

function rotZ(v: Vec3, deg: number): Vec3 {
  const c = Math.cos(deg * DEG);
  const s = Math.sin(deg * DEG);
  return { x: c * v.x - s * v.y, y: s * v.x + c * v.y, z: v.z };
}

function rotY(v: Vec3, deg: number): Vec3 {
  const c = Math.cos(deg * DEG);
  const s = Math.sin(deg * DEG);
  return { x: c * v.x + s * v.z, y: v.y, z: -s * v.x + c * v.z };
}

/**
 * General precession J2000 -> equinox of date (rigorous zeta/theta/z
 * rotation). Valid to well under an arcminute for dates within a few
 * centuries of J2000.
 */
export function precessFromJ2000(v: Vec3, jd: number): Vec3 {
  const t = (jd - 2451545.0) / 36525;
  if (Math.abs(t) < 1e-9) return v;
  const zeta =
    (2306.2181 * t + 1.39656 * t * t - 0.000139 * t * t * t) / 3600;
  const z =
    (2306.2181 * t + 1.39656 * t * t + 2.02026 * t * t * t) / 3600;
  const theta =
    (2004.3109 * t - 0.8533 * t * t - 0.000217 * t * t * t) / 3600;
  return rotY(rotZ(rotZ(v, zeta), theta), z);
}

export interface Horizontal {
  /** altitude degrees, geometric (no refraction) */
  alt: number;
  /** azimuth degrees, 0 = north, 90 = east */
  az: number;
}

/** Equatorial (RA/Dec degrees, equinox of date) -> horizontal. */
export function eqToHorizontal(
  raDeg: number,
  decDeg: number,
  lstDeg: number,
  latDeg: number
): Horizontal {
  const H = (lstDeg - raDeg) * DEG; // hour angle, radians
  const dec = decDeg * DEG;
  const lat = latDeg * DEG;
  const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(H);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  const az =
    Math.atan2(
      -Math.cos(dec) * Math.sin(H),
      Math.sin(dec) * Math.cos(lat) - Math.cos(dec) * Math.sin(lat) * Math.cos(H)
    ) * RAD;
  return { alt: alt * RAD, az: (az + 360) % 360 };
}

/** Saemundsson atmospheric refraction, degrees. alt in degrees. */
export function refraction(altDeg: number): number {
  if (altDeg < -2) return 0;
  const h = altDeg + 10.3 / (altDeg + 5.11);
  return 1.02 / Math.tan(h * DEG) / 60;
}

function norm360(x: number): number {
  const r = x % 360;
  return r < 0 ? r + 360 : r;
}

/** Obliquity of the ecliptic (degrees) incl. nutation-ish correction. */
export function obliquity(jd: number): number {
  const t = (jd - 2451545.0) / 36525;
  const eps0 =
    23 +
    (26 + (21.448 - 46.815 * t - 0.00059 * t * t + 0.001813 * t * t * t) / 60) / 60;
  const omega = 125.04 - 1934.136 * t;
  return eps0 + 0.00256 * Math.cos(omega * DEG);
}

export interface EclipticBody {
  /** apparent geocentric ecliptic longitude, degrees */
  lon: number;
  /** geocentric latitude, degrees */
  lat: number;
  /** equatorial coordinates of date, degrees */
  ra: number;
  dec: number;
}

function eclipticToEquatorial(lonDeg: number, latDeg: number, jd: number) {
  const eps = obliquity(jd) * DEG;
  const lon = lonDeg * DEG;
  const lat = latDeg * DEG;
  const ra = Math.atan2(
    Math.sin(lon) * Math.cos(eps) - Math.tan(lat) * Math.sin(eps),
    Math.cos(lon)
  );
  const dec = Math.asin(
    Math.sin(lat) * Math.cos(eps) + Math.cos(lat) * Math.sin(eps) * Math.sin(lon)
  );
  return { ra: norm360(ra * RAD), dec: dec * RAD };
}

/** Low-precision apparent Sun (Meeus ch. 25), ~0.01° accuracy. */
export function sunPosition(jd: number): EclipticBody {
  const t = (jd - 2451545.0) / 36525;
  const l0 = norm360(280.46646 + 36000.76983 * t + 0.0003032 * t * t);
  const m = norm360(357.52911 + 35999.05029 * t - 0.0001537 * t * t) * DEG;
  const c =
    (1.914602 - 0.004817 * t - 0.000014 * t * t) * Math.sin(m) +
    (0.019993 - 0.000101 * t) * Math.sin(2 * m) +
    0.000289 * Math.sin(3 * m);
  const trueLon = l0 + c;
  const omega = 125.04 - 1934.136 * t;
  const appLon = norm360(trueLon - 0.00569 - 0.00478 * Math.sin(omega * DEG));
  const { ra, dec } = eclipticToEquatorial(appLon, 0, jd);
  return { lon: appLon, lat: 0, ra, dec };
}

/** Truncated Meeus (ch. 47) Moon, ~0.3° accuracy. */
export function moonPosition(jd: number): EclipticBody {
  const t = (jd - 2451545.0) / 36525;
  const t2 = t * t;
  const t3 = t2 * t;
  const t4 = t3 * t;
  const lp = norm360(218.3164477 + 481267.88123421 * t - 0.0015786 * t2 + t3 / 538841 - t4 / 65194000);
  const d = norm360(297.8501921 + 445267.1114034 * t - 0.0018819 * t2 + t3 / 545868 - t4 / 113065000);
  const m = norm360(357.5291092 + 35999.0502909 * t - 0.0001536 * t2 + t3 / 24490000);
  const mp = norm360(134.9633964 + 477198.8675055 * t + 0.0087414 * t2 + t3 / 69699 - t4 / 14712000);
  const f = norm360(93.272095 + 483202.0175233 * t - 0.0036539 * t2 - t3 / 3526000 + t4 / 863310000);
  const D = d * DEG, M = m * DEG, Mp = mp * DEG, F = f * DEG;

  // Main periodic terms for longitude (degrees, x1e-6 units then scaled).
  let lam =
    6288774 * Math.sin(Mp) +
    1274027 * Math.sin(2 * D - Mp) +
    658314 * Math.sin(2 * D) +
    213618 * Math.sin(2 * Mp) -
    185116 * Math.sin(M) -
    114332 * Math.sin(2 * F) +
    58793 * Math.sin(2 * D - 2 * Mp) +
    57062 * Math.sin(2 * D - M - Mp) +
    53322 * Math.sin(2 * D + Mp) +
    45758 * Math.sin(2 * D - M) -
    40923 * Math.sin(M - Mp) -
    34720 * Math.sin(D + Mp) -
    30383 * Math.sin(M + Mp) +
    15327 * Math.sin(2 * D - 2 * F) -
    12528 * Math.sin(Mp + 2 * F) +
    10980 * Math.sin(Mp - 2 * F) +
    10675 * Math.sin(4 * D - Mp) +
    10034 * Math.sin(3 * Mp) +
    8548 * Math.sin(4 * D - 2 * Mp) -
    7888 * Math.sin(D + M - Mp) -
    6766 * Math.sin(-D + M + Mp) -
    5163 * Math.sin(D - Mp) +
    4987 * Math.sin(D + M) +
    4036 * Math.sin(2 * D - M - 2 * F);
  let beta =
    5128122 * Math.sin(F) +
    280602 * Math.sin(Mp + F) +
    277693 * Math.sin(Mp - F) +
    173237 * Math.sin(2 * D - F) +
    55413 * Math.sin(2 * D - Mp + F) +
    46271 * Math.sin(2 * D - Mp - F) +
    32573 * Math.sin(2 * D + F) +
    17198 * Math.sin(2 * Mp + F) +
    9266 * Math.sin(2 * D + Mp - F) +
    8822 * Math.sin(2 * Mp - F) +
    8216 * Math.sin(2 * D - M - F) +
    4324 * Math.sin(2 * D - 2 * Mp - F) +
    4200 * Math.sin(2 * D + M + F) -
    3359 * Math.sin(D + F) +
    2463 * Math.sin(2 * D - M - Mp + F);

  const e = 1 - 0.002516 * t - 0.0000074 * t2;
  // Terms including M already carry their e-correction approximately; the
  // truncation error is well below our needs.
  void e;

  const lon = norm360(lp + lam / 1e6);
  const lat = beta / 1e6;
  const { ra, dec } = eclipticToEquatorial(lon, lat, jd);
  return { lon, lat, ra, dec };
}

export interface MoonPhase {
  /** illuminated fraction 0..1 */
  illumination: number;
  /** true when the moon is waxing (moving away from new moon) */
  waxing: boolean;
  /** approximate age in days since new moon */
  ageDays: number;
  name: string;
}

export function moonPhase(sunLon: number, moonLon: number): MoonPhase {
  const elong = norm360(moonLon - sunLon);
  const illum = (1 - Math.cos(elong * DEG)) / 2;
  const waxing = elong < 180;
  const ageDays = (elong / 360) * 29.530588;
  let name: string;
  const q = 29.530588 / 4;
  if (ageDays < q * 0.08 || ageDays > 29.530588 - q * 0.08) name = 'New Moon';
  else if (ageDays < q * 0.92) name = 'Waxing Crescent';
  else if (ageDays < q * 1.08) name = 'First Quarter';
  else if (ageDays < q * 1.92) name = 'Waxing Gibbous';
  else if (ageDays < q * 2.08) name = 'Full Moon';
  else if (ageDays < q * 2.92) name = 'Waning Gibbous';
  else if (ageDays < q * 3.08) name = 'Last Quarter';
  else name = 'Waning Crescent';
  return { illumination: illum, waxing, ageDays, name };
}
