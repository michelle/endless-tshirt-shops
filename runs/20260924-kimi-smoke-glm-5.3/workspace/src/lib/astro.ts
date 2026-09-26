/**
 * Skyborn astronomy core — runs identically in the browser and on the server.
 *
 * Everything here is pure math over Intl (timezone data) and the bundled
 * astronomy-engine library, so the customer's live preview and the
 * print-ready render are pixel-for-pixel the same sky.
 */
import * as Astronomy from "astronomy-engine";

export const DEG = Math.PI / 180;

export interface SkyMoment {
  /** UTC instant of the customer's moment. */
  utc: Date;
  /** Local civil date as given by the customer, for display. */
  lat: number;
  lng: number;
}

/**
 * Convert a local civil date/time in an IANA zone to a UTC Date, accounting for
 * DST by probing the zone twice (the standard formatToParts trick).
 */
export function zonedTimeToUtc(
  date: string,
  time: string,
  tz: string,
): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^(\d{2}):(\d{2})$/.exec(time || "12:00");
  if (!m) throw new Error(`bad date: ${date}`);
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  const hh = t ? Number(t[1]) : 12, mm = t ? Number(t[2]) : 0;
  const naive = Date.UTC(y, mo - 1, d, hh, mm, 0);
  let utc = naive;
  // Two passes converge even across DST boundaries.
  for (let i = 0; i < 2; i++) {
    const off = tzOffsetMinutes(new Date(utc), tz);
    utc = naive - off * 60_000;
  }
  return new Date(utc);
}

/** Wall-clock offset of `tz` at instant `at`, in minutes east of UTC. */
export function tzOffsetMinutes(at: Date, tz: string): number {
  try {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: false,
    });
    const parts = dtf.formatToParts(at);
    const get = (type: string) => Number(parts.find(p => p.type === type)?.value ?? "0");
    const asUTC = Date.UTC(
      get("year"), get("month") - 1, get("day"),
      get("hour") % 24, get("minute"), get("second"),
    );
    return Math.round((asUTC - at.getTime()) / 60_000);
  } catch {
    return 0;
  }
}

/** Greenwich apparent sidereal time in hours. */
export function gastHours(date: Date): number {
  return Astronomy.SiderealTime(date);
}

export interface Horizontal {
  alt: number; // degrees above horizon
  az: number;  // degrees clockwise from north
}

/**
 * Convert equatorial coordinates (RA in hours, Dec in degrees) to horizontal
 * coordinates for an observer at (lat, lng) at a given UTC instant.
 * Uses classical spherical trigonometry; visually exact for chart purposes.
 */
export function equatorialToHorizontal(
  raHours: number,
  decDeg: number,
  lat: number,
  lng: number,
  date: Date,
): Horizontal {
  const lst = ((gastHours(date) * 15 + lng) % 360 + 360) % 360; // deg
  const H = ((lst - raHours * 15) * DEG); // hour angle, radians
  const φ = lat * DEG, δ = decDeg * DEG;
  const sinAlt = Math.sin(φ) * Math.sin(δ) + Math.cos(φ) * Math.cos(δ) * Math.cos(H);
  const alt = Math.asin(Math.min(1, Math.max(-1, sinAlt))) / DEG;
  let az = 0;
  if (Math.cos(alt) > 1e-9) {
    const cosAz = (Math.sin(δ) - Math.sin(φ) * sinAlt) / (Math.cos(φ) * Math.cos(alt * DEG));
    az = Math.acos(Math.min(1, Math.max(-1, cosAz))) / DEG;
    if (Math.sin(H) > 0) az = 360 - az;
  }
  return { alt, az };
}

/** Horizontal coordinates for a fixed star given J2000 RA (deg)/Dec (deg). */
export function starHorizontal(raDeg: number, decDeg: number, lat: number, lng: number, date: Date): Horizontal {
  return equatorialToHorizontal(raDeg / 15, decDeg, lat, lng, date);
}

/** Planets worth showing on a shirt. */
export const PLANETS = ["Venus", "Mars", "Jupiter", "Saturn"] as const;
export type PlanetName = (typeof PLANETS)[number];
export const PLANET_GLYPHS: Record<PlanetName, string> = {
  Venus: "♀", Mars: "♂", Jupiter: "♃", Saturn: "♄",
};

export interface SkyBody {
  name: string;
  alt: number;
  az: number;
}

/** Ecliptic bodies above the horizon at the given moment. */
export function planetsAbove(lat: number, lng: number, date: Date): SkyBody[] {
  const out: SkyBody[] = [];
  const observer = new Astronomy.Observer(lat, lng, 0);
  for (const name of PLANETS) {
    try {
      const eq = Astronomy.Equator(Astronomy.Body[name as keyof typeof Astronomy.Body], date, observer, true, true);
      const h = equatorialToHorizontal(eq.ra, eq.dec, lat, lng, date);
      if (h.alt > 5) out.push({ name, alt: h.alt, az: h.az });
    } catch {
      /* planet position unavailable — skip */
    }
  }
  return out;
}

export interface MoonInfo {
  alt: number;
  az: number;
  /** Illuminated fraction 0..1 */
  illum: number;
  /** 0..360 ecliptic elongation: 0 new, 90 first quarter, 180 full, 270 last quarter */
  angle: number;
}

export function moonInfo(lat: number, lng: number, date: Date): MoonInfo | null {
  try {
    const observer = new Astronomy.Observer(lat, lng, 0);
    const eq = Astronomy.Equator(Astronomy.Body.Moon, date, observer, true, true);
    const h = equatorialToHorizontal(eq.ra, eq.dec, lat, lng, date);
    const illum = Astronomy.Illumination(Astronomy.Body.Moon, date);
    const angle = ((Astronomy.MoonPhase(date) % 360) + 360) % 360;
    return {
      alt: h.alt, az: h.az,
      illum: Math.max(0, Math.min(1, illum.phase_fraction)),
      angle,
    };
  } catch {
    return null;
  }
}

export function moonPhaseName(angle: number, illum: number): string {
  if (illum < 0.02) return "New moon";
  if (illum > 0.98) return "Full moon";
  const waxing = angle < 180;
  if (illum < 0.35) return waxing ? "Waxing crescent" : "Waning crescent";
  if (illum < 0.65) return waxing ? "First quarter" : "Last quarter";
  return waxing ? "Waxing gibbous" : "Waning gibbous";
}

/** Points of the galactic equator in J2000 RA/Dec (degrees), for the Milky Way band. */
export function galacticEquator(stepDeg = 3): Array<[number, number]> {
  // IAU galactic-to-equatorial constants.
  const aNGP = 192.85948 * DEG, dNGP = 27.12825 * DEG, l0 = 122.93192 * DEG;
  const pts: Array<[number, number]> = [];
  for (let l = 0; l < 360; l += stepDeg) {
    const b = 0;
    const sinb = Math.sin(b), cosb = Math.cos(b);
    const dl = l0 - l * DEG;
    const sinDL = Math.sin(dl), cosDL = Math.cos(dl);
    const dec = Math.asin(sinb * Math.sin(dNGP) + cosb * Math.cos(dNGP) * cosDL);
    let ra = aNGP + Math.atan2(cosb * sinDL, sinb * Math.cos(dNGP) - cosb * Math.sin(dNGP) * cosDL);
    ra = ((ra / DEG) % 360 + 360) % 360;
    pts.push([ra, dec / DEG]);
  }
  return pts;
}

/** Format a UTC instant as a civil date string, e.g. "14 May 2024". */
const MONTHS = ["January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December"];

export function formatCivilDate(date: string, time: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return date;
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  return `${d} ${MONTHS[mo - 1].slice(0, 3)} ${y}`;
}

export function formatCivilTime(time: string): string {
  const t = /^(\d{2}):(\d{2})$/.exec(time || "");
  if (!t) return "";
  let hh = Number(t[1]);
  const ampm = hh >= 12 ? "PM" : "AM";
  hh = hh % 12 || 12;
  return `${hh}:${t[2]} ${ampm}`;
}

export function formatLat(lat: number): string {
  const h = Math.abs(lat).toFixed(2);
  return `${h}° ${lat >= 0 ? "N" : "S"}`;
}

export function formatLng(lng: number): string {
  const h = Math.abs(lng).toFixed(2);
  return `${h}° ${lng >= 0 ? "E" : "W"}`;
}
