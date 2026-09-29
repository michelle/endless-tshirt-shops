// Solar & lunar position math (NOAA-style approximations).
// Pure functions — used in the browser (live sky summary) and on the server (artwork render).

export interface SkyMoment {
  /** Unix ms (UTC instant) */
  timeMs: number;
  lat: number;
  lon: number;
}

export interface SolarPosition {
  /** Degrees above horizon, -90..90 */
  elevation: number;
  /** Degrees from true north, 0..360 */
  azimuth: number;
}

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

function julianDay(timeMs: number): number {
  return timeMs / 86400000 + 2440587.5;
}

/** Solar declination (rad) and equation of time (minutes) for a unix instant. */
function solarDeclinationAndEoT(timeMs: number): { decl: number; eotMin: number } {
  const d = julianDay(timeMs) - 2451545.0; // days since J2000
  const g = ((357.529 + 0.98560028 * d) % 360) * DEG; // mean anomaly
  const q = ((280.459 + 0.98564736 * d) % 360) * DEG; // mean longitude
  const L = q + (1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * DEG; // ecliptic longitude
  const e = (23.439 - 0.00000036 * d) * DEG; // obliquity
  const decl = Math.asin(Math.sin(e) * Math.sin(L));
  const RA = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
  let eot = (q / DEG - RA * RAD) / 15; // minutes -> hours offset; RA in degrees, 15 deg/hour
  // normalize to (-12, 12) hours
  while (eot > 12) eot -= 24;
  while (eot < -12) eot += 24;
  return { decl, eotMin: eot * 60 };
}

export function solarPosition({ timeMs, lat, lon }: SkyMoment): SolarPosition {
  const { decl } = solarDeclinationAndEoT(timeMs);
  const latR = lat * DEG;

  // Solar noon (UTC ms) for this longitude & day
  const noon = solarNoonUtc(timeMs, lon);
  const hoursFromNoon = (timeMs - noon) / 3600000;
  const hourAngle = hoursFromNoon * 15 * DEG;

  const sinEl = Math.sin(latR) * Math.sin(decl) + Math.cos(latR) * Math.cos(decl) * Math.cos(hourAngle);
  const elevation = Math.asin(Math.min(1, Math.max(-1, sinEl))) * RAD;

  const azY = Math.sin(hourAngle);
  const azX = Math.cos(hourAngle) * Math.sin(latR) - Math.tan(decl) * Math.cos(latR);
  let azimuth = Math.atan2(azY, azX) * RAD + 180;
  azimuth = ((azimuth % 360) + 360) % 360;

  return { elevation, azimuth };
}

/** UTC ms of solar noon (sun transiting the meridian) for the given day & longitude. */
export function solarNoonUtc(timeMs: number, lon: number): number {
  const { eotMin } = solarDeclinationAndEoT(timeMs);
  // noon UTC = 12:00 UTC - longitude/15 hours - EoT
  const dayUtc = Math.floor((timeMs - 43200000) / 86400000) * 86400000 + 43200000; // 12:00 UTC that day
  return dayUtc - (lon / 15) * 3600000 - eotMin * 60000;
}

export interface SunPathPoint extends SolarPosition {
  /** Hours local-to-noon (negative before noon) */
  t: number;
}

/** Sun elevation/azimuth across a day, sampled every `stepMin`. */
export function sunPath(timeMs: number, lat: number, lon: number, stepMin = 20): SunPathPoint[] {
  const noon = solarNoonUtc(timeMs, lon);
  const pts: SunPathPoint[] = [];
  for (let min = -720; min <= 720; min += stepMin) {
    const t = noon + min * 60000;
    const p = solarPosition({ timeMs: t, lat, lon });
    pts.push({ ...p, t: min / 60 });
  }
  return pts;
}

/** Sunrise/sunset times (UTC ms) for the day containing timeMs. Null when polar day/night. */
export function sunRiseSetUtc(timeMs: number, lat: number, lon: number): { sunrise: number | null; sunset: number | null; dayLengthMin: number | null } {
  const noon = solarNoonUtc(timeMs, lon);
  const { decl } = solarDeclinationAndEoT(noon);
  const latR = lat * DEG;
  const cosH = (Math.sin(-0.583 * DEG) - Math.sin(latR) * Math.sin(decl)) / (Math.cos(latR) * Math.cos(decl));
  if (cosH > 1) return { sunrise: null, sunset: null, dayLengthMin: 0 };
  if (cosH < -1) return { sunrise: null, sunset: null, dayLengthMin: 24 * 60 };
  const h = Math.acos(cosH) * RAD; // degrees
  const halfDayMs = (h / 15) * 3600000;
  return {
    sunrise: noon - halfDayMs,
    sunset: noon + halfDayMs,
    dayLengthMin: (2 * h) / 15 * 60,
  };
}

/** Classification of the sky for a moment. */
export type SkyKind = "day" | "golden" | "night";

export function classifySky(elevation: number): SkyKind {
  if (elevation > 15) return "day";
  if (elevation > -6) return "golden";
  return "night";
}

export interface MoonInfo {
  /** 0..1 — fraction of the disc illuminated */
  phase: number;
  /** 0..1 — progress through the lunar month */
  age: number;
  waxing: boolean;
}

export function moonInfo(timeMs: number): MoonInfo {
  const synodic = 29.530588853;
  const age = (((julianDay(timeMs) - 2451550.1) % synodic) + synodic) % synodic;
  const phase = (1 - Math.cos((2 * Math.PI * age) / synodic)) / 2;
  return { phase, age: age / synodic, waxing: age < synodic / 2 };
}

/**
 * Approximate lunar position (good to a few degrees) from the moon's ecliptic
 * longitude offset from the sun (~12.19°/day) — plenty for a graphic sky chart.
 */
export function moonPosition(m: SkyMoment): SolarPosition {
  const d = julianDay(m.timeMs) - 2451545.0;
  const g = ((357.529 + 0.98560028 * d) % 360) * DEG;
  const q = ((280.459 + 0.98564736 * d) % 360) * DEG;
  const sunLon = q + (1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * DEG;
  const age = moonInfo(m.timeMs).age * 29.530588853; // days
  const moonLon = sunLon * RAD + age * 12.19; // ecliptic longitude, degrees
  const e = (23.439 - 0.00000036 * d) * DEG;
  const decl = Math.asin(Math.sin(e) * Math.sin(moonLon * DEG));
  const ra = Math.atan2(Math.cos(e) * Math.sin(moonLon * DEG), Math.cos(moonLon * DEG));

  const noon = solarNoonUtc(m.timeMs, m.lon);
  const hoursFromNoon = (m.timeMs - noon) / 3600000;
  // lunar hour angle uses lunar RA, not solar: shift by RA difference
  const solarRa = sunLonToRa(sunLon, e);
  const raDiffHours = ((ra - solarRa) * RAD) / 15;
  const hourAngle = (hoursFromNoon - raDiffHours) * 15 * DEG;

  const latR = m.lat * DEG;
  const sinEl = Math.sin(latR) * Math.sin(decl) + Math.cos(latR) * Math.cos(decl) * Math.cos(hourAngle);
  const elevation = Math.asin(Math.min(1, Math.max(-1, sinEl))) * RAD;
  const azY = Math.sin(hourAngle);
  const azX = Math.cos(hourAngle) * Math.sin(latR) - Math.tan(decl) * Math.cos(latR);
  let azimuth = Math.atan2(azY, azX) * RAD + 180;
  azimuth = ((azimuth % 360) + 360) % 360;
  return { elevation, azimuth };
}

function sunLonToRa(lonRad: number, obliquityRad: number): number {
  return Math.atan2(Math.cos(obliquityRad) * Math.sin(lonRad), Math.cos(lonRad));
}

/** Deterministic PRNG for star fields. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(...nums: number[]): number {
  let h = 2166136261;
  for (const n of nums) {
    const s = Math.round(n * 1000);
    for (let i = 0; i < 4; i++) {
      h ^= (s >> (i * 8)) & 0xff;
      h = Math.imul(h, 16777619);
    }
  }
  return h >>> 0;
}

export interface SkySummary {
  kind: SkyKind;
  elevation: number;
  azimuth: number;
  solarNoonMs: number;
  sunriseMs: number | null;
  sunsetMs: number | null;
  dayLengthMin: number | null;
  moon: MoonInfo;
}

export function summarizeSky(m: SkyMoment): SkySummary {
  const { elevation, azimuth } = solarPosition(m);
  const noon = solarNoonUtc(m.timeMs, m.lon);
  const { sunrise, sunset, dayLengthMin } = sunRiseSetUtc(m.timeMs, m.lat, m.lon);
  return {
    kind: classifySky(elevation),
    elevation, azimuth,
    solarNoonMs: noon, sunriseMs: sunrise, sunsetMs: sunset, dayLengthMin,
    moon: moonInfo(m.timeMs),
  };
}
