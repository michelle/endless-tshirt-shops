// Sky computation: projects the HYG catalogue onto the horizontal frame of a
// given moment and place. Runs identically in the browser (live preview) and
// on the server (print raster).

import starsData from '../data/stars.json';
import conData from '../data/constellation-lines.json';
import {
  DEG,
  eqToHorizontal,
  eqToVec,
  julianDate,
  lstDegrees,
  moonPhase,
  moonPosition,
  precessFromJ2000,
  refraction,
  sunPosition,
  vecToEq,
  type Horizontal,
} from './astronomy';

// stars.json rows: [hip, bf, proper, raHours, decDeg, mag, ci|null, con]
type StarRow = [number, string, string, number, number, number, number | null, string];
const STAR_ROWS = starsData.stars as StarRow[];

// Pre-computed J2000 unit vectors (module-level, computed once).
const STAR_VECS: Float64Array = (() => {
  const a = new Float64Array(STAR_ROWS.length * 3);
  for (let i = 0; i < STAR_ROWS.length; i++) {
    const v = eqToVec(STAR_ROWS[i][3] * 15, STAR_ROWS[i][4]);
    a[i * 3] = v.x;
    a[i * 3 + 1] = v.y;
    a[i * 3 + 2] = v.z;
  }
  return a;
})();

const HIP_INDEX: Map<number, number> = (() => {
  const m = new Map<number, number>();
  for (let i = 0; i < STAR_ROWS.length; i++) if (STAR_ROWS[i][0]) m.set(STAR_ROWS[i][0], i);
  return m;
})();

export interface ProjectedStar {
  alt: number;
  az: number;
  mag: number;
  ci: number | null;
  proper: string;
}

export interface ConstellationSegment {
  a: Horizontal;
  b: Horizontal;
}

export interface SkyBody extends Horizontal {
  ra: number;
  dec: number;
}

export interface Sky {
  stars: ProjectedStar[];
  constellations: { name: string; segments: ConstellationSegment[] }[];
  sun: SkyBody;
  moon: SkyBody;
  moonPhase: ReturnType<typeof moonPhase>;
  lst: number;
}

/** Stars this close below the geometric horizon are still drawn (refraction). */
const HORIZON_PAD = -3;

export function computeSky(utcMs: number, latDeg: number, lonDeg: number): Sky {
  const jd = julianDate(utcMs);
  const lst = lstDegrees(jd, lonDeg);

  const horizOf = (raDeg: number, decDeg: number): Horizontal => {
    const h = eqToHorizontal(raDeg, decDeg, lst, latDeg);
    return { alt: h.alt + refraction(h.alt), az: h.az };
  };

  const stars: ProjectedStar[] = [];
  const positions: Horizontal[] = new Array(STAR_ROWS.length);
  for (let i = 0; i < STAR_ROWS.length; i++) {
    const v = precessFromJ2000(
      { x: STAR_VECS[i * 3], y: STAR_VECS[i * 3 + 1], z: STAR_VECS[i * 3 + 2] },
      jd
    );
    const { ra, dec } = vecToEq(v);
    const h = horizOf(ra, dec);
    positions[i] = h;
    if (h.alt < HORIZON_PAD) continue;
    const row = STAR_ROWS[i];
    stars.push({ alt: h.alt, az: h.az, mag: row[5], ci: row[6], proper: row[2] });
  }

  const constellations: Sky['constellations'] = [];
  for (const c of conData.constellations as { name: string; lines: [number, number][] }[]) {
    const segments: ConstellationSegment[] = [];
    for (const [hipA, hipB] of c.lines) {
      const ia = HIP_INDEX.get(hipA);
      const ib = HIP_INDEX.get(hipB);
      if (ia === undefined || ib === undefined) continue;
      const a = positions[ia];
      const b = positions[ib];
      if (a.alt < HORIZON_PAD || b.alt < HORIZON_PAD) continue;
      segments.push({ a, b });
    }
    if (segments.length) constellations.push({ name: c.name, segments });
  }

  const sunEq = sunPosition(jd);
  const moonEq = moonPosition(jd);
  const sunH = horizOf(sunEq.ra, sunEq.dec);
  const moonH = horizOf(moonEq.ra, moonEq.dec);

  return {
    stars,
    constellations,
    sun: { ...sunH, ra: sunEq.ra, dec: sunEq.dec },
    moon: { ...moonH, ra: moonEq.ra, dec: moonEq.dec },
    moonPhase: moonPhase(sunEq.lon, moonEq.lon),
    lst,
  };
}

// ---------------------------------------------------------------------------
// Projection: azimuthal equidistant, zenith at centre, north up, east left
// (the classic "sky seen from below" star-chart orientation).
// ---------------------------------------------------------------------------

export interface Projected {
  x: number;
  y: number;
  /** distance from centre in chart radii (1 = horizon) */
  rr: number;
}

export function project(
  alt: number,
  az: number,
  cx: number,
  cy: number,
  R: number
): Projected {
  const rr = Math.max(0, (90 - alt) / 90);
  const r = rr * R;
  const a = az * DEG;
  return { x: cx - r * Math.sin(a), y: cy - r * Math.cos(a), rr };
}

/** Dot radius at print scale for a magnitude. */
export function starRadius(mag: number): number {
  return 1.25 + Math.max(0, 5.6 - mag) * 0.86;
}

const STAR_COLORS: [number, string][] = [
  [-0.25, '#a9c3ff'],
  [0.0, '#c3d4ff'],
  [0.25, '#dfe6ff'],
  [0.5, '#f4f1ff'],
  [0.75, '#fff5e4'],
  [1.0, '#ffe8c4'],
  [1.4, '#ffd9a6'],
  [1.8, '#ffc98f'],
];

export function starNaturalColor(ci: number | null): string {
  if (ci === null) return '#e8e6f0';
  for (const [max, col] of STAR_COLORS) if (ci < max) return col;
  return '#ffb87d';
}

export function blendHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) * t + ((pb >> 16) & 255) * (1 - t));
  const g = Math.round(((pa >> 8) & 255) * t + ((pb >> 8) & 255) * (1 - t));
  const bl = Math.round((pa & 255) * t + (pb & 255) * (1 - t));
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0')}`;
}
