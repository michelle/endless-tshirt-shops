import { MAX_LINES, Spec, specHash } from "./spec";

export type Pt = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };

export type PlacedStation = {
  pt: Pt;
  dir: Pt;
  label: string;
  note?: string;
  major: boolean;
  lineIdx: number;
  /** another line already carries this stop name, so it is not labelled again */
  shared: boolean;
  /** this stop sits exactly on the owning line's node - the owner draws it */
  atOwner: boolean;
  interchange: boolean;
};

export type PlacedLine = { name: string; color: string; pts: Pt[] };

export type PlacedLabel = {
  station: PlacedStation;
  /** anchor point the text block hangs off */
  x: number;
  y: number;
  rotate: number;
  anchor: "start" | "middle" | "end";
  /** y offset of the top of the text block, relative to the anchor */
  top: number;
  capL: number;
  capN: number;
  box: Rect;
};

export type Layout = {
  lines: PlacedLine[];
  stations: PlacedStation[];
  labels: PlacedLabel[];
  region: Rect;
};

/* ------------------------------------------------------------------ maths */

const len = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y);
const same = (a: Pt, b: Pt) => Math.abs(a.x - b.x) < 0.01 && Math.abs(a.y - b.y) < 0.01;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Connect two points with at most one 45-degree bend (octilinear house style). */
function connect(a: Pt, b: Pt, diagFirst: boolean): Pt[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax < 0.5 || ay < 0.5 || Math.abs(ax - ay) < 0.5) return [b];
  const sx = Math.sign(dx);
  const sy = Math.sign(dy);
  const d = Math.min(ax, ay);
  const mid: Pt = diagFirst
    ? { x: a.x + sx * d, y: a.y + sy * d }
    : ax > ay
      ? { x: a.x + sx * (ax - ay), y: a.y }
      : { x: a.x, y: a.y + sy * (ay - ax) };
  return [mid, b];
}

function polyline(waypoints: Pt[], rnd: () => number): Pt[] {
  const out: Pt[] = [waypoints[0]];
  for (let i = 1; i < waypoints.length; i++) {
    for (const p of connect(out[out.length - 1], waypoints[i], rnd() > 0.5)) {
      if (!same(p, out[out.length - 1])) out.push(p);
    }
  }
  return out;
}

function arcTable(pts: Pt[]): number[] {
  const acc = [0];
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + len(pts[i - 1], pts[i]));
  return acc;
}

function atDistance(pts: Pt[], acc: number[], t: number): { pt: Pt; dir: Pt; seg: number } {
  const total = acc[acc.length - 1];
  const d = Math.max(0, Math.min(total, t));
  let i = 1;
  while (i < acc.length - 1 && acc[i] < d) i++;
  const segLen = acc[i] - acc[i - 1] || 1;
  const f = (d - acc[i - 1]) / segLen;
  const a = pts[i - 1];
  const b = pts[i];
  return {
    pt: { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f },
    dir: { x: (b.x - a.x) / segLen, y: (b.y - a.y) / segLen },
    seg: i,
  };
}

/** Cut a polyline down to the stretch between two arc positions. */
function slicePolyline(pts: Pt[], acc: number[], t0: number, t1: number): Pt[] {
  const total = acc[acc.length - 1];
  const a = Math.max(0, Math.min(total, t0));
  const b = Math.max(a + 1, Math.min(total, t1));
  const start = atDistance(pts, acc, a);
  const end = atDistance(pts, acc, b);
  const out: Pt[] = [start.pt];
  for (let i = start.seg; i < end.seg; i++) if (!same(pts[i], out[out.length - 1])) out.push(pts[i]);
  if (!same(end.pt, out[out.length - 1])) out.push(end.pt);
  return out.length >= 2 ? out : [start.pt, end.pt];
}

/** Slide a station off a corner so nodes always sit on straight track. */
function avoidCorner(acc: number[], t: number, gap: number): number {
  let i = 1;
  while (i < acc.length - 1 && acc[i] < t) i++;
  const s = acc[i - 1];
  const e = acc[i];
  if (e - s <= gap * 2) return (s + e) / 2;
  return Math.max(s + gap, Math.min(e - gap, t));
}

/* --------------------------------------------------------------- templates */

/** Normalised route skeletons. Chosen by hand so routes always cross. */
const TEMPLATES: Pt[][][] = [
  [
    [{ x: 0.0, y: 0.3 }, { x: 0.52, y: 0.13 }, { x: 1.0, y: 0.35 }],
    [{ x: 0.06, y: 1.0 }, { x: 0.46, y: 0.58 }, { x: 1.0, y: 0.06 }],
    [{ x: 0.26, y: 0.0 }, { x: 0.6, y: 0.46 }, { x: 0.16, y: 1.0 }],
    [{ x: 0.0, y: 0.74 }, { x: 0.5, y: 0.92 }, { x: 1.0, y: 0.62 }],
  ],
  [
    [{ x: 0.0, y: 0.14 }, { x: 0.4, y: 0.36 }, { x: 1.0, y: 0.18 }],
    [{ x: 0.0, y: 0.9 }, { x: 0.5, y: 0.46 }, { x: 0.94, y: 0.88 }],
    [{ x: 0.14, y: 0.0 }, { x: 0.3, y: 0.62 }, { x: 0.88, y: 1.0 }],
    [{ x: 1.0, y: 0.54 }, { x: 0.42, y: 0.74 }, { x: 0.02, y: 0.44 }],
  ],
  [
    [{ x: 0.02, y: 0.54 }, { x: 0.36, y: 0.2 }, { x: 0.74, y: 0.38 }, { x: 1.0, y: 0.16 }],
    [{ x: 0.1, y: 0.0 }, { x: 0.44, y: 0.5 }, { x: 0.72, y: 1.0 }],
    [{ x: 1.0, y: 0.76 }, { x: 0.52, y: 0.66 }, { x: 0.0, y: 0.94 }],
    [{ x: 0.22, y: 1.0 }, { x: 0.66, y: 0.56 }, { x: 0.98, y: 0.44 }],
  ],
  [
    [{ x: 0.0, y: 0.24 }, { x: 0.46, y: 0.48 }, { x: 1.0, y: 0.3 }],
    [{ x: 0.0, y: 0.64 }, { x: 0.4, y: 0.84 }, { x: 1.0, y: 0.72 }],
    [{ x: 0.18, y: 0.0 }, { x: 0.66, y: 0.3 }, { x: 0.9, y: 1.0 }],
    [{ x: 0.96, y: 0.0 }, { x: 0.56, y: 0.86 }, { x: 0.06, y: 1.0 }],
  ],
];

/* ----------------------------------------------------------------- metrics */

export const M = {
  stroke: 13,
  corner: 30,
  grid: 20,
  tickLen: 30,
  tickWidth: 5.5,
  ringOuter: 15.5,
  ringInner: 7.5,
  overhang: 30,
  labelSize: 23,
  noteSize: 17,
  labelGap: 4,
  labelOffset: 28,
};

/* ------------------------------------------------------------------ layout */

type TextMetrics = {
  measure: (text: string, size: number, weight: 400 | 600 | 800) => number;
  cap: (size: number, weight: 400 | 600 | 800) => number;
};

export function layout(spec: Spec, region: Rect, tm: TextMetrics): Layout {
  const seed = specHash(spec);
  const rnd = mulberry32(seed);
  const tmpl = TEMPLATES[spec.variant % TEMPLATES.length];
  const g = M.grid;
  const snap = (p: Pt): Pt => ({
    x: Math.round((region.x + p.x * region.w) / g) * g,
    y: Math.round((region.y + p.y * region.h) / g) * g,
  });

  const lines: PlacedLine[] = [];
  const stations: PlacedStation[] = [];
  /** normalised stop label -> point already committed by an earlier line */
  const owned = new Map<string, PlacedStation>();

  const specLines = spec.lines.slice(0, MAX_LINES);

  for (let k = 0; k < specLines.length; k++) {
    const src = specLines[k];
    const base = tmpl[k % tmpl.length];
    const jitter = (v: number) => Math.max(0, Math.min(1, v + (rnd() - 0.5) * 0.06));
    const anchors = base.map((p, i) =>
      snap(i === 0 || i === base.length - 1 ? p : { x: jitter(p.x), y: jitter(p.y) }),
    );

    // Stops that already exist on another line become mandatory waypoints, so the
    // two routes physically meet and we can draw a real interchange.
    const pins: { idx: number; pt: Pt; owner: PlacedStation }[] = [];
    src.stations.forEach((st, idx) => {
      const hit = owned.get(norm(st.label));
      if (hit && pins.length < 3) pins.push({ idx, pt: hit.pt, owner: hit });
    });

    const waypoints: Pt[] = [anchors[0]];
    for (const p of pins) waypoints.push(p.pt);
    for (const a of anchors.slice(1)) waypoints.push(a);

    let pts = polyline(dedupe(waypoints), rnd);
    if (pts.length < 2) pts = [anchors[0], anchors[anchors.length - 1]];
    let acc = arcTable(pts);
    let total = acc[acc.length - 1];

    // Where each pinned stop lands along the route.
    const known = new Map<number, number>();
    for (const p of pins) {
      const at = nearestArc(pts, acc, p.pt);
      known.set(p.idx, at);
    }

    const n = src.stations.length;
    const pos = new Array<number>(n).fill(NaN);
    for (const [idx, t] of known) pos[idx] = t;
    const overhang = Math.min(M.overhang, total * 0.06);
    if (isNaN(pos[0])) pos[0] = overhang;
    if (isNaN(pos[n - 1])) pos[n - 1] = total - overhang;

    // Interpolate the unpinned stops between the fixed ones.
    let i = 0;
    while (i < n) {
      if (!isNaN(pos[i])) { i++; continue; }
      let j = i;
      while (j < n && isNaN(pos[j])) j++;
      const before = pos[i - 1];
      const after = j < n ? pos[j] : total;
      const steps = j - i + 1;
      for (let q = 0; q < j - i; q++) pos[i + q] = before + ((after - before) * (q + 1)) / steps;
      i = j;
    }

    // Monotonic + off-corner.
    for (let q = 1; q < n; q++) if (pos[q] < pos[q - 1]) pos[q] = pos[q - 1];

    // A pinned first/last stop can leave a long stub of empty track hanging off
    // the end of the route. Trim the route back to just past its terminus.
    const t0 = pos[0] - overhang;
    const t1 = pos[n - 1] + overhang;
    if (t0 > 1 || t1 < total - 1) {
      const trimmed = slicePolyline(pts, acc, t0, t1);
      const shift = Math.max(0, t0);
      pts = trimmed;
      acc = arcTable(pts);
      total = acc[acc.length - 1];
      for (let q = 0; q < n; q++) pos[q] = Math.max(0, Math.min(total, pos[q] - shift));
    }

    const gap = M.ringOuter + 12;

    // Only the stops that actually became routing waypoints sit on the other
    // line's node. A repeated name beyond that keeps its own place on its own
    // track - it just is not labelled twice.
    const pinnedIdx = new Set(pins.map((p) => p.idx));

    src.stations.forEach((st, idx) => {
      const t = avoidCorner(acc, pos[idx], gap);
      const { pt, dir } = atDistance(pts, acc, t);
      const prior = owned.get(norm(st.label));
      const atOwner = !!prior && pinnedIdx.has(idx);
      const placed: PlacedStation = {
        pt: atOwner ? prior!.pt : pt,
        dir,
        label: st.label,
        note: st.note,
        major: !!st.major,
        lineIdx: k,
        shared: !!prior,
        atOwner,
        interchange: atOwner || !!st.major,
      };
      if (atOwner && prior) {
        prior.interchange = true;
        if (!prior.note && st.note) prior.note = st.note;
      } else if (!prior) {
        owned.set(norm(st.label), placed);
      }
      stations.push(placed);
    });

    lines.push({ name: src.name, color: src.color, pts });
  }

  fitToRegion(lines, stations, region);
  const labels = placeLabels(stations, lines, region, tm);
  return { lines, stations, labels, region };
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Trimming routes back to their termini can leave the network floating in a
 * corner. Scale it uniformly (so every angle stays octilinear) to fill the
 * space it has been given.
 */
function fitToRegion(lines: PlacedLine[], stations: PlacedStation[], region: Rect) {
  const all: Pt[] = [];
  for (const l of lines) all.push(...l.pts);
  for (const s of stations) all.push(s.pt);
  if (!all.length) return;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of all) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  const bw = maxX - minX;
  const bh = maxY - minY;
  if (bw < 1 || bh < 1) return;

  const inset = 26;
  const tw = region.w - inset * 2;
  const th = region.h - inset * 2;
  const scale = Math.max(0.75, Math.min(1.45, Math.min(tw / bw, th / bh)));
  const ox = region.x + inset + (tw - bw * scale) / 2 - minX * scale;
  const oy = region.y + inset + (th - bh * scale) / 2 - minY * scale;

  // Shared interchange stops reuse one point object; only move each one once.
  const seen = new Set<Pt>();
  for (const p of all) {
    if (seen.has(p)) continue;
    seen.add(p);
    p.x = p.x * scale + ox;
    p.y = p.y * scale + oy;
  }
}

function dedupe(pts: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (const p of pts) if (!out.length || !same(p, out[out.length - 1])) out.push(p);
  return out;
}

function nearestArc(pts: Pt[], acc: number[], target: Pt): number {
  let best = 0;
  let bestD = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const L = len(a, b) || 1;
    const t = Math.max(0, Math.min(1, ((target.x - a.x) * (b.x - a.x) + (target.y - a.y) * (b.y - a.y)) / (L * L)));
    const px = a.x + (b.x - a.x) * t;
    const py = a.y + (b.y - a.y) * t;
    const d = Math.hypot(target.x - px, target.y - py);
    if (d < bestD) { bestD = d; best = acc[i - 1] + t * L; }
  }
  return best;
}

/* ------------------------------------------------------------ label solver */

type Candidate = { dx: number; dy: number; rotate: number; anchor: "start" | "middle" | "end" };

const DIAG = Math.SQRT1_2;

const CANDIDATES: Record<string, Candidate> = {
  E:  { dx: 1,  dy: 0,  rotate: 0,   anchor: "start" },
  W:  { dx: -1, dy: 0,  rotate: 0,   anchor: "end" },
  N:  { dx: 0,  dy: -1, rotate: 0,   anchor: "middle" },
  S:  { dx: 0,  dy: 1,  rotate: 0,   anchor: "middle" },
  NE: { dx: DIAG,  dy: -DIAG, rotate: -45, anchor: "start" },
  SW: { dx: -DIAG, dy: DIAG,  rotate: -45, anchor: "end" },
  SE: { dx: DIAG,  dy: DIAG,  rotate: 45,  anchor: "start" },
  NW: { dx: -DIAG, dy: -DIAG, rotate: 45,  anchor: "end" },
};

function preferenceFor(dir: Pt): string[] {
  const ax = Math.abs(dir.x);
  const ay = Math.abs(dir.y);
  if (ax > 0.9) return ["N", "S", "NE", "NW", "SE", "SW", "E", "W"];
  if (ay > 0.9) return ["E", "W", "NE", "SE", "NW", "SW", "N", "S"];
  // diagonal track: label perpendicular to it
  return dir.x * dir.y > 0
    ? ["NE", "SW", "E", "W", "N", "S", "NW", "SE"]
    : ["SE", "NW", "E", "W", "N", "S", "NE", "SW"];
}

function overlaps(a: Rect, b: Rect, pad = 0): boolean {
  return (
    a.x - pad < b.x + b.w && a.x + a.w + pad > b.x && a.y - pad < b.y + b.h && a.y + a.h + pad > b.y
  );
}

function pointInRect(p: Pt, r: Rect, pad = 0): boolean {
  return p.x > r.x - pad && p.x < r.x + r.w + pad && p.y > r.y - pad && p.y < r.y + r.h + pad;
}

function placeLabels(
  stations: PlacedStation[],
  lines: PlacedLine[],
  region: Rect,
  tm: TextMetrics,
): PlacedLabel[] {
  // Sample the routes so labels can be kept off the track.
  const trackPts: Pt[] = [];
  for (const l of lines) {
    const acc = arcTable(l.pts);
    const total = acc[acc.length - 1];
    for (let t = 0; t <= total; t += 10) trackPts.push(atDistance(l.pts, acc, t).pt);
  }

  const placed: PlacedLabel[] = [];
  const taken: Rect[] = [];

  // Longest labels first: they are the hardest to fit.
  const order = stations
    .map((s, i) => ({ s, i }))
    .filter((o) => !o.s.shared)
    .sort((a, b) => b.s.label.length - a.s.label.length);

  for (const { s } of order) {
    const w = Math.max(
      tm.measure(s.label, M.labelSize, 600),
      s.note ? tm.measure(s.note, M.noteSize, 400) : 0,
    );
    const capL = tm.cap(M.labelSize, 600);
    const capN = s.note ? tm.cap(M.noteSize, 400) : 0;
    const h = capL + (s.note ? M.labelGap + capN : 0);
    const off = (s.interchange ? M.ringOuter : M.tickLen / 2) + M.labelOffset * 0.5;

    let best: PlacedLabel | null = null;
    let bestScore = Infinity;
    const prefs = preferenceFor(s.dir);

    for (const key of prefs) {
      const c = CANDIDATES[key];
      const ox = s.pt.x + c.dx * off;
      const oy = s.pt.y + c.dy * off;

      let box: Rect;
      const top = c.rotate !== 0 ? -h / 2 : c.dy < 0 ? -h : c.dy > 0 ? 0 : -h / 2;
      if (c.rotate === 0) {
        const bx = c.anchor === "start" ? ox : c.anchor === "end" ? ox - w : ox - w / 2;
        box = { x: bx, y: oy + top, w, h };
      } else {
        // Conservative axis-aligned bound for 45-degree text.
        const e = (w + h) * DIAG;
        const cx = ox + (c.anchor === "start" ? 1 : -1) * (w / 2) * DIAG;
        const cy = oy + (c.anchor === "start" ? (c.rotate < 0 ? -1 : 1) : c.rotate < 0 ? 1 : -1) * (w / 2) * DIAG;
        box = { x: cx - e / 2, y: cy - e / 2, w: e, h: e };
      }

      let score = 0;
      if (box.x < region.x - 30) score += 400 + (region.x - box.x);
      if (box.y < region.y - 10) score += 400 + (region.y - box.y);
      if (box.x + box.w > region.x + region.w + 30) score += 400 + (box.x + box.w - region.x - region.w);
      if (box.y + box.h > region.y + region.h + 10) score += 400 + (box.y + box.h - region.y - region.h);

      for (const t of taken) if (overlaps(box, t, 3)) score += 260;
      for (const other of stations) {
        if (other === s) continue;
        if (pointInRect(other.pt, box, M.ringOuter)) score += 220;
      }
      for (const tp of trackPts) if (pointInRect(tp, box, 2)) score += 14;
      if (c.rotate !== 0) score += 34; // horizontal labels read better on a shirt

      score += prefs.indexOf(key) * 6;

      if (score < bestScore) {
        bestScore = score;
        best = { station: s, x: ox, y: oy, rotate: c.rotate, anchor: c.anchor, top, capL, capN, box };
        if (score === 0) break;
      }
    }

    if (best) {
      taken.push(best.box);
      placed.push(best);
    }
  }

  return placed;
}
