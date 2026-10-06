'use strict';

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function segPointDist(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function ccw(a, b, c) { return (c.y - a.y) * (b.x - a.x) - (b.y - a.y) * (c.x - a.x); }
function segsCross(a, b, c, d) {
  return ccw(a, c, d) * ccw(b, c, d) < 0 && ccw(a, b, c) * ccw(a, b, d) < 0;
}

// Grow a tree of n stars inside a disc of radius R, then add a loop or two.
function generate(rng, n, R) {
  const minD = (0.8 / Math.sqrt(n)) * R;
  const stars = [{ x: (rng() - 0.5) * R * 0.3, y: (rng() - 0.5) * R * 0.3 }];
  const edges = [];
  const deg = [0];

  const clear = (p, from, minDist) => {
    if (Math.hypot(p.x, p.y) > R * 0.92) return false;
    for (let i = 0; i < stars.length; i++) if (dist(p, stars[i]) < minDist) return false;
    for (let i = 0; i < stars.length; i++) {
      if (i !== from && segPointDist(stars[i], stars[from], p) < minDist * 0.5) return false;
    }
    for (const [a, b] of edges) {
      if (a === from || b === from) continue;
      if (segsCross(stars[from], p, stars[a], stars[b])) return false;
      if (segPointDist(p, stars[a], stars[b]) < minDist * 0.5) return false;
    }
    return true;
  };

  for (let i = 1; i < n; i++) {
    let placed = false;
    for (let attempt = 0; attempt < 600 && !placed; attempt++) {
      const relax = 1 - 0.45 * (attempt / 600);
      let from;
      do { from = Math.floor(rng() * stars.length); } while (deg[from] >= 3 && rng() < 0.85);
      const ang = rng() * Math.PI * 2;
      const len = minD * (1 + rng() * 1.15);
      const p = { x: stars[from].x + Math.cos(ang) * len, y: stars[from].y + Math.sin(ang) * len };
      if (clear(p, from, minD * relax)) {
        stars.push(p); deg.push(1); deg[from]++; edges.push([from, i]); placed = true;
      }
    }
    if (!placed) {
      let best = 0;
      const p = { x: (rng() - 0.5) * R, y: (rng() - 0.5) * R };
      stars.forEach((s, j) => { if (dist(s, p) < dist(stars[best], p)) best = j; });
      stars.push(p); deg.push(1); deg[best]++; edges.push([best, i]);
    }
  }

  if (n >= 6) {
    const pairs = [];
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      if (edges.some(([a, b]) => (a === i && b === j) || (a === j && b === i))) continue;
      const d = dist(stars[i], stars[j]);
      if (d < minD * 1.9) pairs.push([d, i, j]);
    }
    pairs.sort((p, q) => p[0] - q[0]);
    let extra = 0;
    for (const [, i, j] of pairs) {
      if (extra >= 2 || rng() < 0.45) continue;
      let ok = true;
      for (let k = 0; k < n && ok; k++) if (k !== i && k !== j && segPointDist(stars[k], stars[i], stars[j]) < minD * 0.5) ok = false;
      for (const [a, b] of edges) {
        if (!ok) break;
        if (a !== i && a !== j && b !== i && b !== j && segsCross(stars[i], stars[j], stars[a], stars[b])) ok = false;
      }
      if (ok) { edges.push([i, j]); extra++; }
    }
  }

  // Centre on the bounding box and scale so the figure fills the field.
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const s of stars) { minX = Math.min(minX, s.x); maxX = Math.max(maxX, s.x); minY = Math.min(minY, s.y); maxY = Math.max(maxY, s.y); }
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  let far = 0;
  for (const s of stars) far = Math.max(far, Math.hypot(s.x - cx, s.y - cy));
  const k = far > 0 ? (R * 0.78) / far : 1;
  for (const s of stars) { s.x = (s.x - cx) * k; s.y = (s.y - cy) * k; }

  return { stars, edges };
}

// Scatter faint background stars that stay clear of the figure.
function fieldStars(rng, R, figure, count, minGap, avoid) {
  const out = [];
  for (let tries = 0; tries < count * 25 && out.length < count; tries++) {
    const a = rng() * Math.PI * 2;
    const r = Math.sqrt(rng()) * (R - 40);
    const p = { x: Math.cos(a) * r, y: Math.sin(a) * r };
    if (figure.stars.some((s) => dist(s, p) < avoid)) continue;
    if (figure.edges.some(([i, j]) => segPointDist(p, figure.stars[i], figure.stars[j]) < avoid * 0.45)) continue;
    if (out.some((q) => dist(q, p) < minGap)) continue;
    out.push({ ...p, rad: 6 + Math.pow(rng(), 3) * 11, op: 0.45 + rng() * 0.5, spark: rng() < 0.07 });
  }
  return out;
}

module.exports = { generate, fieldStars };
