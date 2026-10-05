/**
 * A small, dependency-free set of astronomy helpers.
 *
 * Everything here is accurate enough to place naked-eye stars on a printed
 * chart (a fraction of a degree at the zenith, degrading slightly near the
 * horizon). It is deliberately not an ephemeris: no nutation, aberration or
 * precession beyond the standard GMST polynomial.
 */

export const DEG = Math.PI / 180;

/** Julian Date from a JS Date (UTC). */
export function toJulian(date: Date): number {
  return date.getTime() / 86_400_000 + 2_440_587.5;
}

/** Greenwich Mean Sidereal Time in degrees (IAU 1982 polynomial). */
export function gmstDegrees(jd: number): number {
  const t = (jd - 2_451_545.0) / 36_525.0;
  const gmst =
    280.46061837 +
    360.98564736629 * (jd - 2_451_545.0) +
    0.000387933 * t * t -
    (t * t * t) / 38_710_000;
  return ((gmst % 360) + 360) % 360;
}

/** Local sidereal time in degrees for an east-positive longitude. */
export function localSiderealDegrees(jd: number, longitude: number): number {
  return (((gmstDegrees(jd) + longitude) % 360) + 360) % 360;
}

export interface Horizontal {
  /** Altitude above the horizon, degrees. */
  alt: number;
  /** Azimuth from north, clockwise, degrees. */
  az: number;
}

/** Convert equatorial coordinates to horizontal coordinates. */
export function toHorizontal(
  raDeg: number,
  decDeg: number,
  latDeg: number,
  lstDeg: number,
): Horizontal {
  const h = (((lstDeg - raDeg) % 360) + 360) % 360;
  const hRad = h * DEG;
  const dec = decDeg * DEG;
  const lat = latDeg * DEG;
  const sinAlt =
    Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(hRad);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  const cosAlt = Math.cos(alt);
  let az: number;
  if (Math.abs(cosAlt) < 1e-9) {
    az = 0;
  } else {
    const cosA =
      (Math.sin(dec) - Math.sin(alt) * Math.sin(lat)) / (cosAlt * Math.cos(lat));
    az = Math.acos(Math.max(-1, Math.min(1, cosA))) / DEG;
    if (Math.sin(hRad) > 0) az = 360 - az;
  }
  return { alt: alt / DEG, az };
}

/**
 * Project a horizontal coordinate onto a unit disk where the zenith is the
 * centre (0,0), the horizon is the rim (radius 1), north is up and east is to
 * the left, matching the way a person lying on their back sees the sky.
 */
export function project(alt: number, az: number): { x: number; y: number; r: number } {
  const r = Math.max(0, (90 - alt) / 90);
  const a = az * DEG;
  return { x: -r * Math.sin(a), y: -r * Math.cos(a), r };
}

export interface MoonPosition {
  raDeg: number;
  decDeg: number;
  /** Illuminated fraction 0..1. */
  illumination: number;
  /** Waxing when true. */
  waxing: boolean;
  phase: number;
}

/**
 * Low precision lunar position and phase (Meeus, abridged). Good to roughly a
 * degree and a few percent illumination, which is all a printed chart needs.
 */
export function moonPosition(date: Date): MoonPosition {
  const jd = toJulian(date);
  const t = (jd - 2_451_545.0) / 36_525.0;
  const rad = DEG;

  // Mean elements (degrees).
  const Lp = 218.3164477 + 481267.88123421 * t;
  const D = 297.8501921 + 445267.1114034 * t;
  const M = 357.5291092 + 35999.0502909 * t;
  const Mp = 134.9633964 + 477198.8675055 * t;
  const F = 93.272095 + 483202.0175233 * t;

  const Lpr = ((Lp % 360) + 360) % 360;
  const Dr = D * rad;
  const Mr = M * rad;
  const Mpr = Mp * rad;
  const Fr = F * rad;

  // Ecliptic longitude (degrees), principal terms only.
  const lon =
    Lpr +
    6.288774 * Math.sin(Mpr) +
    1.274027 * Math.sin(2 * Dr - Mpr) +
    0.658314 * Math.sin(2 * Dr) +
    0.213618 * Math.sin(2 * Mpr) -
    0.185116 * Math.sin(Mr) -
    0.114332 * Math.sin(2 * Fr);
  // Ecliptic latitude (degrees).
  const lat =
    5.128122 * Math.sin(Fr) +
    0.280602 * Math.sin(Mpr + Fr) +
    0.277693 * Math.sin(Mpr - Fr) +
    0.173237 * Math.sin(2 * Dr - Fr);

  const eps = (23.439291 - 0.0130042 * t) * rad;
  const lonR = (((lon % 360) + 360) % 360) * rad;
  const latR = lat * rad;
  const x = Math.cos(latR) * Math.cos(lonR);
  const y = Math.cos(latR) * Math.sin(lonR);
  const z = Math.sin(latR);
  const ra = Math.atan2(
    y * Math.cos(eps) - z * Math.sin(eps),
    x,
  );
  const dec = Math.asin(y * Math.sin(eps) + z * Math.cos(eps));

  // Phase: elongation from the sun.
  const sunM = (357.5291092 + 35999.0502909 * t) * rad;
  const sunLon =
    (280.46646 + 36000.76983 * t) * rad + 1.9146 * Math.sin(sunM);
  let elong = (((lon * rad - sunLon) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const illumination = (1 - Math.cos(elong)) / 2;
  const waxing = elong < Math.PI;

  return {
    raDeg: ((ra / rad) % 360 + 360) % 360,
    decDeg: dec / rad,
    illumination,
    waxing,
    phase: elong / (2 * Math.PI),
  };
}

/** Format a decimal degree as a degrees/minutes string with a hemisphere. */
export function formatCoordinate(value: number, axis: "lat" | "lng"): string {
  const hemi =
    axis === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
  const abs = Math.abs(value);
  const deg = Math.floor(abs);
  const minutes = Math.round((abs - deg) * 60);
  const d = minutes === 60 ? deg + 1 : deg;
  const m = minutes === 60 ? 0 : minutes;
  return `${d}° ${String(m).padStart(2, "0")}' ${hemi}`;
}
