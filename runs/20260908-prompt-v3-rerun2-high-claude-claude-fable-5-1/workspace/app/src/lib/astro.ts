// Astronomy helpers: convert catalog RA/Dec to horizon coordinates for a
// given moment (UTC) and observer location, and project onto a circular map.

const DEG = Math.PI / 180;

/** Julian Date from a Unix timestamp in milliseconds. */
export function julianDate(unixMs: number): number {
  return unixMs / 86400000 + 2440587.5;
}

/** Greenwich Mean Sidereal Time in degrees (IAU 1982 formula). */
export function gmstDegrees(jd: number): number {
  const d = jd - 2451545.0;
  const t = d / 36525;
  let gmst =
    280.46061837 + 360.98564736629 * d + 0.000387933 * t * t - (t * t * t) / 38710000;
  gmst %= 360;
  if (gmst < 0) gmst += 360;
  return gmst;
}

/** Local sidereal time in degrees for an east-positive longitude. */
export function lstDegrees(unixMs: number, lonDeg: number): number {
  let lst = (gmstDegrees(julianDate(unixMs)) + lonDeg) % 360;
  if (lst < 0) lst += 360;
  return lst;
}

export interface HorizonCoord {
  alt: number; // degrees above horizon
  az: number; // degrees, from North through East
}

/** Equatorial (RA/Dec, degrees) -> horizon (alt/az) for observer at lat, with LST. */
export function toHorizon(raDeg: number, decDeg: number, latDeg: number, lstDeg: number): HorizonCoord {
  const ha = (lstDeg - raDeg) * DEG;
  const dec = decDeg * DEG;
  const lat = latDeg * DEG;
  const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(ha);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  const denom = Math.cos(alt) * Math.cos(lat);
  const cosAz = (Math.sin(dec) - Math.sin(alt) * Math.sin(lat)) / (Math.abs(denom) < 1e-9 ? 1e-9 : denom);
  let az = Math.acos(Math.max(-1, Math.min(1, cosAz)));
  if (Math.sin(ha) > 0) az = 2 * Math.PI - az;
  return { alt: alt / DEG, az: az / DEG };
}

/**
 * Stereographic projection of a horizon coordinate onto a disc of radius R.
 * Zenith at the centre, horizon at the rim. North is up and East is to the
 * LEFT, the standard convention for a chart you hold above your head.
 */
export function projectToDisc(coord: HorizonCoord, cx: number, cy: number, R: number): { x: number; y: number } {
  const z = (90 - coord.alt) * DEG; // zenith distance
  const r = (R * Math.tan(z / 2)) / Math.tan(Math.PI / 4);
  const az = coord.az * DEG;
  return { x: cx - r * Math.sin(az), y: cy - r * Math.cos(az) };
}
