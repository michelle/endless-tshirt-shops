// Astronomy core: turns (local date, time, lat, lon) into the positions of the
// real stars above the horizon at that moment, projected onto a unit disc.
// Star data: Yale Bright Star Catalog subset via the d3-celestial project
// (BSD-3-Clause), baked into src/data. Isomorphic (client + server).

import tzLookup from "tz-lookup";
import starsData from "@/data/stars.json";
import constellationsData from "@/data/constellations.json";
import type { DesignParams } from "./design";

// [raDeg, decDeg, magnitude, bMinusV]
const STARS = starsData as unknown as [number, number, number, number][];
// { IAU: [ [ [ra,dec], ... ], ... ] }
const LINES = constellationsData as unknown as Record<string, [number, number][][]>;

const D2R = Math.PI / 180;

export interface SkyStar {
  x: number; // -1..1 within the star-map disc (east = -x, like looking up)
  y: number; // -1..1 (north = -y)
  mag: number;
  bv: number;
}

export interface SkyLine {
  points: { x: number; y: number }[];
}

export interface SkyResult {
  stars: SkyStar[];
  lines: SkyLine[];
  timezone: string;
  utcIso: string;
}

/**
 * Convert a wall-clock time at a location into the UTC instant, using the
 * IANA timezone for those coordinates (handles DST for that date).
 */
export function localMomentToUtc(date: string, time: string, lat: number, lon: number) {
  const zone = tzLookup(lat, lon);
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);

  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hour12: false,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  });

  let guess = Date.UTC(y, mo - 1, d, h, mi);
  for (let i = 0; i < 4; i++) {
    const parts = Object.fromEntries(
      fmt.formatToParts(guess).map((p) => [p.type, p.value])
    );
    let hour = Number(parts.hour) % 24;
    const wallAsUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      hour,
      Number(parts.minute),
      Number(parts.second)
    );
    const offset = wallAsUtc - guess;
    const next = Date.UTC(y, mo - 1, d, h, mi) - offset;
    if (next === guess) break;
    guess = next;
  }
  return { utc: new Date(guess), zone };
}

/** Julian date from a JS Date. */
function julianDate(utc: Date): number {
  return utc.getTime() / 86400000 + 2440587.5;
}

/** Greenwich Mean Sidereal Time in degrees. */
function gmst(utc: Date): number {
  const jd = julianDate(utc);
  const t = (jd - 2451545.0) / 36525;
  let g =
    280.46061837 +
    360.98564736629 * (jd - 2451545) +
    0.000387933 * t * t -
    (t * t * t) / 38710000;
  g = g % 360;
  return g < 0 ? g + 360 : g;
}

/** Altitude/azimuth (degrees) for an equatorial position. Az from north, clockwise. */
function altAz(raDeg: number, decDeg: number, latDeg: number, lstDeg: number) {
  const h = (lstDeg - raDeg) * D2R;
  const dec = decDeg * D2R;
  const lat = latDeg * D2R;
  const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(h);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  const az =
    Math.atan2(
      -Math.cos(dec) * Math.sin(h),
      Math.sin(dec) * Math.cos(lat) - Math.cos(dec) * Math.sin(lat) * Math.cos(h)
    ) + Math.PI; // shift so 0 = north
  return { alt: alt / D2R, az: (az / D2R + 360) % 360 };
}

/**
 * Project alt/az onto the unit disc: north up, east left (the sky as seen
 * looking up), equidistant from the zenith.
 */
function project(alt: number, az: number) {
  const r = (90 - alt) / 90;
  const a = az * D2R;
  return { x: -r * Math.sin(a), y: -r * Math.cos(a) };
}

export function computeSky(design: Pick<DesignParams, "date" | "time" | "lat" | "lon">): SkyResult {
  const { utc, zone } = localMomentToUtc(design.date, design.time, design.lat, design.lon);
  const lst = (gmst(utc) + design.lon + 360) % 360;

  const stars: SkyStar[] = [];
  for (const [ra, dec, mag, bv] of STARS) {
    const { alt, az } = altAz(ra, dec, design.lat, lst);
    if (alt <= 0) continue;
    const { x, y } = project(alt, az);
    stars.push({ x, y, mag, bv });
  }

  const lines: SkyLine[] = [];
  for (const segments of Object.values(LINES)) {
    for (const seg of segments) {
      let prevAbove = false;
      let run: { x: number; y: number }[] = [];
      for (const [ra, dec] of seg) {
        const { alt, az } = altAz(ra, dec, design.lat, lst);
        const above = alt > 1;
        if (above && prevAbove) {
          const { x, y } = project(alt, az);
          run.push({ x, y });
        } else if (above && !prevAbove) {
          const { x, y } = project(alt, az);
          run = [{ x, y }];
        } else {
          if (run.length > 1) lines.push({ points: run });
          run = [];
        }
        prevAbove = above;
      }
      if (run.length > 1) lines.push({ points: run });
    }
  }

  return { stars, lines, timezone: zone, utcIso: utc.toISOString() };
}

/** Star marker radius (relative units, multiply by disc radius) from magnitude. */
export function starRadius(mag: number): number {
  // mag -1 -> ~0.02, mag 5 -> ~0.0025 (relative to disc radius), capped
  return Math.min(0.02, 0.0032 * Math.pow(10, -(mag - 5.2) / 4.2));
}

/** Approximate star color from B-V color index. */
export function starColor(bv: number): string {
  if (bv < 0.1) return "#cdd8ff";
  if (bv < 0.4) return "#e8ecff";
  if (bv < 0.8) return "#fff6e8";
  if (bv < 1.2) return "#ffe4c0";
  return "#ffd2a1";
}
