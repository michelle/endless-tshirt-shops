// Minimal positional-astronomy engine for Nightloom.
// Accuracy target: ~arcminutes around J2000 — far beyond what is visible
// on a decorative star map (the map is ~0.08°/px at print resolution).
//
// Coordinate conventions:
//  - RA/Dec in degrees, J2000 equinox (HYG catalog), precessed to the target date.
//  - Longitude east-positive. Latitude north-positive.
//  - Azimuth measured from North, eastward (N=0, E=90, S=180, W=270).

const DEG = Math.PI / 180;

export function norm360(x: number): number {
  return ((x % 360) + 360) % 360;
}

/** Julian Day from a JS timestamp (ms since Unix epoch, UTC). */
export function julianDay(ms: number): number {
  return ms / 86400000 + 2440587.5;
}

/**
 * Greenwich Mean Sidereal Time in degrees (IAU 1982 model).
 * Input: Julian Day (UT1 ≈ UTC is fine for our accuracy).
 */
export function gmstDeg(jd: number): number {
  const d = jd - 2451545.0;
  const t = d / 36525;
  const gmst =
    280.46061837 +
    360.98564736629 * d +
    0.000387933 * t * t -
    (t * t * t) / 38710000;
  return norm360(gmst);
}

/**
 * Low-precision general precession, J2000 -> epoch.
 * `years` is years (can be negative) from J2000.0.
 * Good to ~1 arcminute for |years| < 100.
 */
export function precessJ2000(
  raDeg: number,
  decDeg: number,
  years: number
): { ra: number; dec: number } {
  const ra = raDeg * DEG;
  const dec = decDeg * DEG;
  // m, n in seconds of time per year; dDec coefficient in arcsec per year.
  const m = 3.07496;
  const n = 1.33621;
  const dRaSec = (m + n * Math.sin(ra) * Math.tan(dec)) * years;
  const dDecArcsec = 20.043 * Math.cos(ra) * years;
  return {
    ra: norm360(raDeg + (dRaSec * 15) / 3600),
    dec: decDeg + dDecArcsec / 3600,
  };
}

/** Equatorial (RA/Dec deg, precessed) -> horizontal (alt/az deg) for a location + LST. */
export function altAz(
  raDeg: number,
  decDeg: number,
  latDeg: number,
  lstDeg: number
): { alt: number; az: number } {
  const ha = (lstDeg - raDeg) * DEG;
  const dec = decDeg * DEG;
  const lat = latDeg * DEG;
  const sinAlt =
    Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(ha);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  const az = Math.atan2(
    -Math.cos(dec) * Math.sin(ha),
    Math.sin(dec) * Math.cos(lat) - Math.cos(dec) * Math.cos(lat) * Math.cos(ha)
  );
  return { alt: alt / DEG, az: norm360(az / DEG) };
}

/**
 * Equidistant-azimuthal ("planisphere") projection: zenith at the centre,
 * horizon on the rim. Oriented as seen looking up at the sky: North up, East left.
 * Returns coordinates relative to the circle centre plus normalized radius.
 */
export function projectAltAz(
  alt: number,
  az: number,
  radius: number
): { x: number; y: number; rNorm: number } {
  const rNorm = (90 - alt) / 90; // 0 at zenith, 1 at horizon
  const r = rNorm * radius;
  const azRad = az * DEG;
  return {
    x: -r * Math.sin(azRad),
    y: -r * Math.cos(azRad),
    rNorm,
  };
}

/**
 * Build the UTC instant for "wall-clock time at a longitude".
 * We interpret the user's date/time as Local Mean Solar Time at the given
 * longitude (UTC = LMST − lon/15h). This keeps the sky consistent with the
 * chosen place without needing a timezone database — and matches how
 * decorative star-map products frame "the sky over <place> that night".
 */
export function instantForLocalTime(
  dateStr: string,
  timeStr: string,
  lonDeg: number
): { ms: number; yearsFromJ2000: number } {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  const localMs = Date.UTC(y, (mo || 1) - 1, d || 1, hh || 0, mm || 0, 0);
  const ms = localMs - (lonDeg / 15) * 3600000;
  const yearsFromJ2000 = (julianDay(ms) - 2451545.0) / 365.25;
  return { ms, yearsFromJ2000 };
}

/** Local Sidereal Time in degrees for an instant + longitude (east-positive). */
export function lstDeg(ms: number, lonDeg: number): number {
  return norm360(gmstDeg(julianDay(ms)) + lonDeg);
}

/**
 * Approximate stellar color from B-V color index.
 * ci -> temperature (Ballesteros 2012) -> sRGB (Tanner Helland approximation),
 * gently desaturated so stars read as "starlight" rather than candy.
 */
export function starColor(ci: number): { r: number; g: number; b: number } {
  const clamped = Math.max(-0.35, Math.min(2.0, ci));
  const temp = 4600 * (1 / (0.92 * clamped + 1.7) + 1 / (0.92 * clamped + 0.62));
  const t = Math.max(1200, Math.min(12000, temp)) / 100;
  let r: number, g: number, b: number;
  if (t <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(t) - 161.1195681661;
    b =
      t <= 19
        ? 0
        : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  } else {
    r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
    g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
    b = 255;
  }
  // Desaturate ~35% toward white.
  const mix = (v: number) => Math.round(Math.max(0, Math.min(255, 0.65 * v + 0.35 * 250)));
  return { r: mix(r), g: mix(g), b: mix(b) };
}
