// Positional astronomy: equatorial (RA/Dec, J2000) -> horizontal (alt/az) for a
// given UTC instant and observer location. Accuracy is ~arcminute level, which is
// far beyond what a printed chart needs (we ignore precession, nutation, proper
// motion and atmospheric refraction).

export function julianDate(d: Date): number {
  return d.getTime() / 86400000 + 2440587.5;
}

/** Greenwich mean sidereal time, degrees. */
export function gmstDeg(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  const st =
    280.46061837 +
    360.98564736629 * (jd - 2451545) +
    0.000387933 * T * T -
    (T * T * T) / 38710000;
  return ((st % 360) + 360) % 360;
}

const D2R = Math.PI / 180;

/**
 * Altitude and azimuth (degrees). Azimuth is measured clockwise from north
 * (0 = N, 90 = E). lonDeg is east-positive.
 */
export function altAz(
  raHours: number,
  decDeg: number,
  dateUtc: Date,
  latDeg: number,
  lonDeg: number
): { alt: number; az: number } {
  const lstDeg = gmstDeg(julianDate(dateUtc)) + lonDeg;
  const ha = (lstDeg - raHours * 15) * D2R;
  const dec = decDeg * D2R;
  const lat = latDeg * D2R;

  const sinAlt =
    Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(ha);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));

  const east = -Math.cos(dec) * Math.sin(ha);
  const north =
    Math.cos(lat) * Math.sin(dec) - Math.sin(lat) * Math.cos(dec) * Math.cos(ha);
  const az = Math.atan2(east, north) / D2R;

  return { alt: alt / D2R, az: (az + 360) % 360 };
}

/**
 * Zenith-centred stereographic projection onto a disc of radius R at (cx, cy).
 * North is up, east is right (map convention). Returns null below the horizon.
 */
export function project(
  raHours: number,
  decDeg: number,
  dateUtc: Date,
  latDeg: number,
  lonDeg: number,
  cx: number,
  cy: number,
  R: number,
  minAltDeg = 0
): { x: number; y: number; alt: number } | null {
  const { alt, az } = altAz(raHours, decDeg, dateUtc, latDeg, lonDeg);
  if (alt < minAltDeg) return null;
  const z = (90 - alt) * D2R;
  const r = R * Math.tan(z / 2); // tan(45deg) = 1, so horizon lands on r = R
  const a = az * D2R;
  return { x: cx + r * Math.sin(a), y: cy - r * Math.cos(a), alt };
}
