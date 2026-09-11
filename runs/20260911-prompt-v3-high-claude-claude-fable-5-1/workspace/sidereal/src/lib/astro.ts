// Minimal positional astronomy: enough to place catalogue stars in the sky
// for an observer at (lat, lon) at a given UTC instant.

const DEG = Math.PI / 180;

export function julianDate(d: Date): number {
  return d.getTime() / 86400000 + 2440587.5;
}

/** Greenwich mean sidereal time in degrees (Meeus, ch. 12). */
export function gmstDeg(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  const g = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T - (T * T * T) / 38710000;
  return ((g % 360) + 360) % 360;
}

/** Local sidereal time in degrees for an east-positive longitude. */
export function lstDeg(utc: Date, lonDeg: number): number {
  return (((gmstDeg(julianDate(utc)) + lonDeg) % 360) + 360) % 360;
}

export interface Horizontal {
  alt: number; // degrees above horizon
  az: number; // degrees from north through east
}

/** Convert equatorial (RA/Dec, degrees) to horizontal coordinates. */
export function toHorizontal(raDeg: number, decDeg: number, latDeg: number, lst: number): Horizontal {
  const H = (lst - raDeg) * DEG; // hour angle, positive west
  const dec = decDeg * DEG;
  const lat = latDeg * DEG;
  const sinDec = Math.sin(dec), cosDec = Math.cos(dec);
  const sinLat = Math.sin(lat), cosLat = Math.cos(lat);
  const up = sinDec * sinLat + cosDec * cosLat * Math.cos(H);
  const north = sinDec * cosLat - cosDec * sinLat * Math.cos(H);
  const east = -cosDec * Math.sin(H);
  const alt = Math.asin(Math.max(-1, Math.min(1, up))) / DEG;
  let az = Math.atan2(east, north) / DEG;
  if (az < 0) az += 360;
  return { alt, az };
}

/**
 * Stereographic projection from the zenith. Returns chart coordinates where
 * the horizon is a circle of radius R around (cx, cy). North is up and, as
 * on any chart of the sky seen from below, East is on the LEFT.
 */
export function project(h: Horizontal, cx: number, cy: number, R: number): { x: number; y: number; r: number } {
  const z = (90 - h.alt) * DEG; // zenith distance
  const r = R * Math.tan(z / 2);
  const a = h.az * DEG;
  return { x: cx - r * Math.sin(a), y: cy - r * Math.cos(a), r };
}

// ---- Time zone handling -------------------------------------------------

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function tzOffsetMinutes(utc: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const p: Record<string, number> = {};
  for (const part of dtf.formatToParts(utc)) if (part.type !== "literal") p[part.type] = Number(part.value);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour === 24 ? 0 : p.hour, p.minute, p.second);
  return (asUtc - utc.getTime()) / 60000;
}

/** Interpret a wall-clock date + time in an IANA zone and return the UTC instant. */
export function localToUtc(date: string, time: string, tz: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const wall = Date.UTC(y, m - 1, d, hh, mm);
  let guess = wall;
  for (let i = 0; i < 3; i++) guess = wall - tzOffsetMinutes(new Date(guess), tz) * 60000;
  return new Date(guess);
}
