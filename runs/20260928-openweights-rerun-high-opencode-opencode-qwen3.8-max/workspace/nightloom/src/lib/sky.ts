// Builds the sky model: projects catalog stars, constellation lines and labels
// onto the planisphere disc for a given instant + location.
// Shared by the browser preview and the server-side print renderer, so the
// shirt you design is exactly the shirt that gets printed.

import starsData from '@/data/stars.json';
import conData from '@/data/constellations.json';
import {
  altAz,
  instantForLocalTime,
  lstDeg,
  precessJ2000,
  projectAltAz,
  starColor,
} from './astronomy';

export interface SkyStar {
  x: number; // relative to disc centre
  y: number;
  r: number; // radius in the same units as `radius`
  color: string; // css rgb()
  mag: number;
  bright: number; // 0..1 brightness tier for glow/spikes
}

export interface SkySegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface SkyLabel {
  x: number;
  y: number;
  text: string;
}

export interface SkyModel {
  stars: SkyStar[];
  segments: SkySegment[];
  constellationLabels: SkyLabel[];
  starLabels: SkyLabel[];
}

export interface BuildSkyOptions {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM (local mean solar time at lng)
  lat: number;
  lng: number;
  /** Radius of the map disc in output units (print px or preview px). */
  radius: number;
  showLines: boolean;
  showLabels: boolean;
}

// Star radius in print units at the reference map radius, log-scaled by magnitude.
const REF_RADIUS = 2050;
function starRadius(mag: number, radius: number): number {
  const scale = radius / REF_RADIUS;
  const r = 30 * Math.pow(10, -0.14 * (mag + 1.5));
  return Math.max(9.5 * scale, Math.min(38 * scale, r * scale));
}

export function buildSky(opts: BuildSkyOptions): SkyModel {
  const { date, time, lat, lng, radius, showLines, showLabels } = opts;
  const { ms, yearsFromJ2000 } = instantForLocalTime(date, time, lng);
  const lst = lstDeg(ms, lng);

  const abbrs: string[] = starsData.abbrs;
  const rawStars: number[][] = starsData.stars;
  const nameByHip: Record<string, string> = starsData.names;
  const conNames: Record<string, string> = conData.names;
  const rawSegments: number[][] = conData.segments;

  // Project every catalog star above the horizon.
  const stars: SkyStar[] = [];
  const posByHip = new Map<number, { x: number; y: number }>();
  const conVisible = new Map<number, { pts: { x: number; y: number }[]; bestMag: number }>();

  for (let i = 0; i < rawStars.length; i++) {
    const [ra100, dec100, mag100, ci100, hip, conIx] = rawStars[i];
    const mag = mag100 / 100;
    const pre = precessJ2000(ra100 / 100, dec100 / 100, yearsFromJ2000);
    const { alt, az } = altAz(pre.ra, pre.dec, lat, lst);
    if (alt <= 0.35) continue; // keep a hair above the horizon line
    const p = projectAltAz(alt, az, radius);
    const c = starColor(ci100 / 100);
    const r = starRadius(mag, radius);
    stars.push({
      x: p.x,
      y: p.y,
      r,
      color: `rgb(${c.r},${c.g},${c.b})`,
      mag,
      bright: mag < 0.4 ? 2 : mag < 1.2 ? 1 : 0,
    });
    if (hip) posByHip.set(hip, { x: p.x, y: p.y });
    if (conIx >= 0) {
      let e = conVisible.get(conIx);
      if (!e) {
        e = { pts: [], bestMag: 9 };
        conVisible.set(conIx, e);
      }
      e.pts.push({ x: p.x, y: p.y });
      if (mag < e.bestMag) e.bestMag = mag;
    }
  }

  // Sort so bright stars paint last (on top).
  stars.sort((a, b) => b.mag - a.mag);

  const segments: SkySegment[] = [];
  if (showLines) {
    for (const [a, b] of rawSegments) {
      const pa = posByHip.get(a);
      const pb = posByHip.get(b);
      if (!pa || !pb) continue;
      segments.push({ x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y });
    }
  }

  const constellationLabels: SkyLabel[] = [];
  const placedRects: { x: number; y: number; w: number }[] = [];
  const far = (x: number, y: number, w: number) =>
    !placedRects.some((r) => Math.abs(r.x - x) < (r.w + w) * 0.62 && Math.abs(r.y - y) < 210);

  if (showLabels) {
    // Label the constellations with the brightest visible star, capped to avoid clutter.
    const entries = [...conVisible.entries()]
      .filter(([, v]) => v.pts.length >= 4)
      .sort((a, b) => a[1].bestMag - b[1].bestMag)
      .slice(0, 24);
    for (const [conIx, v] of entries) {
      const abbr = abbrs[conIx];
      const text = conNames[abbr];
      if (!text) continue;
      let sx = 0;
      let sy = 0;
      for (const p of v.pts) {
        sx += p.x;
        sy += p.y;
      }
      const x0 = sx / v.pts.length;
      const y0 = sy / v.pts.length;
      let x = x0;
      let y = y0;
      const rr = Math.hypot(x, y);
      const max = radius * 0.86;
      if (rr > max) {
        x = (x * max) / rr;
        y = (y * max) / rr;
      }
      const w = text.length * 110;
      if (!far(x, y, w)) continue;
      placedRects.push({ x, y, w });
      constellationLabels.push({ x, y, text });
    }
  }

  // Star name labels need hip association; second cheap pass over the catalog.
  const starLabels: SkyLabel[] = [];
  if (showLabels) {
    const labelCandidates: { x: number; y: number; r: number; name: string; mag: number }[] = [];
    for (let i = 0; i < rawStars.length; i++) {
      const [, , mag100, , hip] = rawStars[i];
      const mag = mag100 / 100;
      if (mag > 2.3 || !hip) continue;
      const name = nameByHip[String(hip)];
      if (!name) continue;
      const pos = posByHip.get(hip);
      if (!pos) continue;
      labelCandidates.push({ x: pos.x, y: pos.y, r: starRadius(mag, radius), name, mag });
    }
    labelCandidates.sort((a, b) => a.mag - b.mag);
    for (const c of labelCandidates.slice(0, 40)) {
      let x = c.x + c.r * 1.9;
      let y = c.y + c.r * 1.6;
      const rr = Math.hypot(x, y);
      const max = radius * 0.9;
      if (rr > max) {
        x = (x * max) / rr;
        y = (y * max) / rr;
      }
      const w = c.name.length * 95;
      if (!far(x, y, w)) continue;
      placedRects.push({ x, y, w });
      starLabels.push({ x, y, text: c.name });
      if (starLabels.length >= 20) break;
    }
  }

  return { stars, segments, constellationLabels, starLabels };
}
