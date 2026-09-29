// Astronomy math for computing the apparent positions of stars for a given
// date, time and location on Earth. All angles are in degrees unless noted.

const DEG = Math.PI / 180;

/** Julian Date for a given UTC Date. */
export function julianDate(date: Date): number {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  const ut =
    date.getUTCHours() +
    date.getUTCMinutes() / 60 +
    date.getUTCSeconds() / 3600 +
    date.getUTCMilliseconds() / 3600000;

  let yy = y;
  let mm = m;
  if (m <= 2) {
    yy -= 1;
    mm += 12;
  }
  const A = Math.floor(yy / 100);
  const B = 2 - A + Math.floor(A / 4);
  const jd =
    Math.floor(365.25 * (yy + 4716)) +
    Math.floor(30.6001 * (mm + 1)) +
    d +
    B -
    1524.5 +
    ut / 24;
  return jd;
}

/** Greenwich Mean Sidereal Time in hours (0..24). */
export function gmstHours(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  let gmst =
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    0.000387933 * T * T -
    (T * T * T) / 38710000.0;
  gmst = ((gmst % 360) + 360) % 360;
  return gmst / 15.0;
}

/** Local sidereal time in hours for a given longitude (degrees, east positive). */
export function lstHours(jd: number, lngDeg: number): number {
  const lst = gmstHours(jd) + lngDeg / 15.0;
  return ((lst % 24) + 24) % 24;
}

export interface Horizontal {
  alt: number; // altitude in degrees (-90..90)
  az: number; // azimuth in degrees, measured from north, eastward (0..360)
}

/**
 * Convert equatorial coordinates (RA/Dec in degrees) to horizontal
 * coordinates (altitude/azimuth) for an observer at latDeg/lngDeg.
 */
export function toHorizontal(
  raDeg: number,
  decDeg: number,
  latDeg: number,
  lst: number
): Horizontal {
  const H = ((lst - raDeg / 15.0) * 15.0) * DEG; // hour angle in radians
  const dec = decDeg * DEG;
  const lat = latDeg * DEG;

  const sinAlt =
    Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(H);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt))) / DEG;

  const az =
    Math.atan2(
      -Math.sin(H) * Math.cos(dec),
      Math.sin(dec) * Math.cos(lat) - Math.cos(dec) * Math.sin(lat) * Math.cos(H)
    ) / DEG;

  return { alt, az: ((az % 360) + 360) % 360 };
}

export interface Point {
  x: number;
  y: number;
}

/**
 * Stereographic projection centered on the zenith. Returns coordinates in a
 * unit circle where the horizon (altitude 0) maps to radius 1 and the zenith
 * maps to the origin. North is up (-y), east is +x.
 */
export function projectZenith(alt: number, az: number): Point {
  const z = (90 - alt) * DEG; // zenith angle in radians
  const r = Math.tan(z / 2); // stereographic radius; horizon -> 1
  const a = az * DEG;
  return {
    x: r * Math.sin(a),
    y: -r * Math.cos(a),
  };
}

/** Approximate position of the Moon (geocentric ecliptic -> equatorial). */
export function moonRaDec(jd: number): { ra: number; dec: number; phase: number } {
  const T = (jd - 2451545.0) / 36525.0;
  // Mean orbital elements (simplified, good to ~1 degree).
  const L = (218.316 + 481267.8813 * T) % 360; // mean longitude
  const M = (134.963 + 477198.8676 * T) % 360; // mean anomaly
  const D = (297.85 + 445267.1115 * T) % 360; // mean elongation
  const Ms = (357.529 + 35999.0503 * T) % 360; // sun mean anomaly
  const F = (93.272 + 483202.0175 * T) % 360; // argument of latitude

  const lon =
    L +
    6.289 * Math.sin(M * DEG) +
    1.274 * Math.sin((2 * D - M) * DEG) +
    0.658 * Math.sin(2 * D * DEG) +
    0.214 * Math.sin(2 * M * DEG) -
    0.186 * Math.sin(Ms * DEG);
  const lat =
    5.128 * Math.sin(F * DEG) +
    0.2806 * Math.sin((M + F) * DEG) +
    0.2777 * Math.sin((M - F) * DEG);

  const obliquity = 23.439 - 0.013 * T; // obliquity of the ecliptic
  const ra =
    Math.atan2(
      Math.sin(lon * DEG) * Math.cos(obliquity * DEG) -
        Math.tan(lat * DEG) * Math.sin(obliquity * DEG),
      Math.cos(lon * DEG)
    ) / DEG;
  const dec =
    Math.asin(
      Math.sin(lat * DEG) * Math.cos(obliquity * DEG) +
        Math.cos(lat * DEG) * Math.sin(obliquity * DEG) * Math.sin(lon * DEG)
    ) / DEG;

  // Illuminated fraction (phase), 0 = new, 1 = full.
  const phase = (1 - Math.cos(D * DEG)) / 2;

  return { ra: ((ra % 360) + 360) % 360, dec, phase };
}
