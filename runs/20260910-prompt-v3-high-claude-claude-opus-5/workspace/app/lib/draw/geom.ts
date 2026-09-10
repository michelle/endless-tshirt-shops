export type Pt = { x: number; y: number };

export const D2R = Math.PI / 180;
export const n = (v: number) => (Math.round(v * 10) / 10).toString();

export function polar(o: Pt, angleDeg: number, r: number): Pt {
  const a = angleDeg * D2R;
  return { x: o.x + Math.cos(a) * r, y: o.y + Math.sin(a) * r };
}

/** Catmull-Rom -> cubic Bezier. Produces the soft, hand-drawn outlines. */
export function smoothPath(pts: Pt[], closed = false): string {
  if (pts.length < 2) return '';
  const p = closed
    ? [pts[pts.length - 1], ...pts, pts[0], pts[1]]
    : [pts[0], ...pts, pts[pts.length - 1]];
  let d = `M${n(pts[0].x)} ${n(pts[0].y)}`;
  for (let i = 1; i < p.length - 2; i++) {
    const p0 = p[i - 1], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2];
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += `C${n(c1.x)} ${n(c1.y)} ${n(c2.x)} ${n(c2.y)} ${n(p2.x)} ${n(p2.y)}`;
  }
  if (closed) d += 'Z';
  return d;
}

export function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
