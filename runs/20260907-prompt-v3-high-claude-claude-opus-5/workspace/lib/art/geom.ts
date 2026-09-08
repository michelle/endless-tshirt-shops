/** Small vector/path helpers used by the creature generator.
 *  Everything emits plain SVG path data so the exact same string can be
 *  rendered in the browser and rasterised on the server. */

export type Pt = { x: number; y: number };

export const pt = (x: number, y: number): Pt => ({ x, y });
export const add = (a: Pt, b: Pt): Pt => pt(a.x + b.x, a.y + b.y);
export const sub = (a: Pt, b: Pt): Pt => pt(a.x - b.x, a.y - b.y);
export const mul = (a: Pt, k: number): Pt => pt(a.x * k, a.y * k);
export const len = (a: Pt): number => Math.hypot(a.x, a.y) || 1e-6;
export const norm = (a: Pt): Pt => mul(a, 1 / len(a));
export const perp = (a: Pt): Pt => pt(-a.y, a.x);
export const lerpPt = (a: Pt, b: Pt, t: number): Pt =>
  pt(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);

const n = (v: number) => (Math.round(v * 100) / 100).toString();

/** Catmull-Rom through `points`, converted to cubic beziers. */
export function smoothPath(points: Pt[], closed: boolean, tension = 1): string {
  const p = points;
  if (p.length < 2) return "";
  const at = (i: number) =>
    closed
      ? p[((i % p.length) + p.length) % p.length]
      : p[Math.max(0, Math.min(p.length - 1, i))];

  let d = `M${n(p[0].x)} ${n(p[0].y)}`;
  const last = closed ? p.length : p.length - 1;
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1 = pt(
      p1.x + ((p2.x - p0.x) / 6) * tension,
      p1.y + ((p2.y - p0.y) / 6) * tension
    );
    const c2 = pt(
      p2.x - ((p3.x - p1.x) / 6) * tension,
      p2.y - ((p3.y - p1.y) / 6) * tension
    );
    d += `C${n(c1.x)} ${n(c1.y)} ${n(c2.x)} ${n(c2.y)} ${n(p2.x)} ${n(p2.y)}`;
  }
  return closed ? d + "Z" : d;
}

/** A closed organic shape: an ellipse whose radius wobbles per-vertex.
 *  `wobble` values are supplied by the caller so the shape is deterministic. */
export function blob(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  wobble: number[],
  rotation = 0
): string {
  const count = wobble.length;
  const pts: Pt[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rotation;
    const r = 1 + wobble[i];
    pts.push(pt(cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r));
  }
  return smoothPath(pts, true);
}

/** Build a closed outline around a polyline, tapering from w0 to w1.
 *  Used for limbs, necks, tails and tendrils. */
export function taperedLimb(spine: Pt[], w0: number, w1: number, capRound = true): string {
  if (spine.length < 2) return "";
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i < spine.length; i++) {
    const prev = spine[Math.max(0, i - 1)];
    const next = spine[Math.min(spine.length - 1, i + 1)];
    const dir = norm(sub(next, prev));
    const nrm = perp(dir);
    const t = i / (spine.length - 1);
    // ease the taper so limbs read as muscular rather than conical
    const w = (w0 + (w1 - w0) * (t * t * (3 - 2 * t))) / 2;
    left.push(add(spine[i], mul(nrm, w)));
    right.push(add(spine[i], mul(nrm, -w)));
  }
  const tip = spine[spine.length - 1];
  const tipDir = norm(sub(tip, spine[spine.length - 2]));
  const ring: Pt[] = [...left];
  if (capRound && w1 > 1) {
    ring.push(add(tip, mul(tipDir, w1 / 2)));
  }
  ring.push(...right.reverse());
  return smoothPath(ring, true, 0.9);
}

/** Sample an arc as a polyline spine. */
export function arcSpine(
  origin: Pt,
  angle: number,
  length: number,
  curve: number,
  steps = 8
): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = angle + curve * t;
    const r = length * t;
    out.push(pt(origin.x + Math.cos(a) * r, origin.y + Math.sin(a) * r));
  }
  // bend the spine progressively instead of rotating rigidly
  const bent: Pt[] = [origin];
  let cur = { ...origin };
  let a = angle;
  const seg = length / steps;
  for (let i = 0; i < steps; i++) {
    a += curve / steps;
    cur = pt(cur.x + Math.cos(a) * seg, cur.y + Math.sin(a) * seg);
    bent.push(cur);
  }
  return bent;
}

export function circle(cx: number, cy: number, r: number): string {
  return `M${n(cx - r)} ${n(cy)}a${n(r)} ${n(r)} 0 1 0 ${n(r * 2)} 0a${n(r)} ${n(
    r
  )} 0 1 0 ${n(-r * 2)} 0Z`;
}

export function polyPath(pts: Pt[], close = true): string {
  if (!pts.length) return "";
  return (
    `M${pts.map((p) => `${n(p.x)} ${n(p.y)}`).join("L")}` + (close ? "Z" : "")
  );
}

/** Zig-zag teeth along a segment; `dir` is 1 for downward points. */
export function teeth(a: Pt, b: Pt, count: number, depth: number, dir = 1): string {
  const pts: Pt[] = [a];
  const d = sub(b, a);
  const nrm = mul(norm(perp(d)), depth * dir);
  for (let i = 0; i < count; i++) {
    const t0 = i / count;
    const t1 = (i + 0.5) / count;
    pts.push(add(lerpPt(a, b, t1), nrm));
    pts.push(lerpPt(a, b, (i + 1) / count));
    void t0;
  }
  return polyPath(pts, true);
}

export const fmt = n;

/** Bounding box over path data. Only valid for the absolute M/L/C paths this
 *  module emits — every number is part of a coordinate pair. Bezier control
 *  points are included, which slightly over-estimates and so pads the fit. */
export function pathsBBox(ds: string[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const d of ds) {
    const nums = d.match(/-?\d+(?:\.\d+)?/g);
    if (!nums) continue;
    for (let i = 0; i + 1 < nums.length; i += 2) {
      const x = parseFloat(nums[i]);
      const y = parseFloat(nums[i + 1]);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (!isFinite(minX)) return { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };
  return { minX, minY, maxX, maxY };
}
