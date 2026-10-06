// Contours — marching squares on an elevation grid, stitched into polylines,
// then simplified (RDP) and smoothed (Chaikin) for a printed-topo look.

const NICE_INTERVALS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000];

export function niceInterval(range, maxLines = 14) {
  if (!(range > 0)) return null;
  for (const c of NICE_INTERVALS) {
    if (range / c <= maxLines) return c;
  }
  return NICE_INTERVALS[NICE_INTERVALS.length - 1];
}

// ---- marching squares ----------------------------------------------------
// grid: Float32Array (w+1)×(h+1) is treated as a lattice of (x,y) points;
// cells are between them. Returns list of segments [x0,y0,x1,y1] (lattice px).
export function marchingSquares(grid, w, h, level) {
  const segs = [];
  const val = (x, y) => grid[y * w + x];
  const lerp = (a, b) => (level - a) / (b - a);
  for (let y = 0; y < h - 1; y++) {
    for (let x = 0; x < w - 1; x++) {
      const tl = val(x, y), tr = val(x + 1, y), br = val(x + 1, y + 1), bl = val(x, y + 1);
      if (!Number.isFinite(tl) || !Number.isFinite(tr) || !Number.isFinite(br) || !Number.isFinite(bl)) continue;
      let idx = 0;
      if (tl > level) idx |= 8;
      if (tr > level) idx |= 4;
      if (br > level) idx |= 2;
      if (bl > level) idx |= 1;
      if (idx === 0 || idx === 15) continue;
      // edge points
      const top = () => [x + lerp(tl, tr), y];
      const right = () => [x + 1, y + lerp(tr, br)];
      const bottom = () => [x + lerp(bl, br), y + 1];
      const left = () => [x, y + lerp(tl, bl)];
      const push = (a, b) => segs.push([a[0], a[1], b[0], b[1]]);
      switch (idx) {
        case 1: push(left(), bottom()); break;
        case 2: push(bottom(), right()); break;
        case 3: push(left(), right()); break;
        case 4: push(top(), right()); break;
        case 5: { // ambiguous: resolve on center value
          const c = (tl + tr + br + bl) / 4;
          if (c > level) { push(left(), top()); push(bottom(), right()); }
          else { push(left(), bottom()); push(top(), right()); }
          break;
        }
        case 6: push(top(), bottom()); break;
        case 7: push(left(), top()); break;
        case 8: push(left(), top()); break;
        case 9: push(top(), bottom()); break;
        case 10: {
          const c = (tl + tr + br + bl) / 4;
          if (c > level) { push(top(), right()); push(bottom(), left()); }
          else { push(top(), left()); push(bottom(), right()); }
          break;
        }
        case 11: push(top(), right()); break;
        case 12: push(left(), right()); break;
        case 13: push(bottom(), right()); break;
        case 14: push(left(), bottom()); break;
      }
    }
  }
  return segs;
}

// ---- stitch segments into polylines ------------------------------------
export function stitch(segs) {
  if (!segs.length) return [];
  const key = (x, y) => `${Math.round(x * 8)},${Math.round(y * 8)}`;
  const endpoints = new Map(); // key -> list of [segIndex, endIdx]
  segs.forEach((s, i) => {
    const ka = key(s[0], s[1]), kb = key(s[2], s[3]);
    (endpoints.get(ka) || endpoints.set(ka, []).get(ka)).push([i, 0]);
    (endpoints.get(kb) || endpoints.set(kb, []).get(kb)).push([i, 1]);
  });
  const used = new Array(segs.length).fill(false);
  const polys = [];
  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue;
    used[i] = true;
    const pts = [segs[i][0], segs[i][1], segs[i][2], segs[i][3]];
    // extend forward
    for (;;) {
      const k = key(pts[pts.length - 2], pts[pts.length - 1]);
      const cands = (endpoints.get(k) || []).filter(([si]) => !used[si]);
      if (!cands.length) break;
      const [si, end] = cands[0];
      used[si] = true;
      const s = segs[si];
      if (end === 0) pts.push(s[2], s[3]);
      else pts.push(s[0], s[1]);
    }
    // extend backward
    for (;;) {
      const k = key(pts[0], pts[1]);
      const cands = (endpoints.get(k) || []).filter(([si]) => !used[si]);
      if (!cands.length) break;
      const [si, end] = cands[0];
      used[si] = true;
      const s = segs[si];
      if (end === 0) pts.unshift(s[2], s[3]);
      else pts.unshift(s[0], s[1]);
    }
    polys.push(pts);
  }
  return polys;
}

// ---- Ramer–Douglas–Peucker ---------------------------------------------
function rdp(pts, eps) {
  const n = pts.length / 2;
  if (n < 3) return pts;
  const keep = new Uint8Array(n);
  keep[0] = keep[n - 1] = 1;
  const stack = [[0, n - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let maxD = -1, maxI = -1;
    const ax = pts[a * 2], ay = pts[a * 2 + 1];
    const bx = pts[b * 2], by = pts[b * 2 + 1];
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    for (let i = a + 1; i < b; i++) {
      const px = pts[i * 2], py = pts[i * 2 + 1];
      let d2;
      if (len2 === 0) d2 = (px - ax) ** 2 + (py - ay) ** 2;
      else {
        let t = ((px - ax) * dx + (py - ay) * dy) / len2;
        t = Math.max(0, Math.min(1, t));
        const qx = ax + t * dx, qy = ay + t * dy;
        d2 = (px - qx) ** 2 + (py - qy) ** 2;
      }
      if (d2 > maxD) { maxD = d2; maxI = i; }
    }
    if (maxD > eps * eps && maxI > 0) {
      keep[maxI] = 1;
      stack.push([a, maxI], [maxI, b]);
    }
  }
  const out = [];
  for (let i = 0; i < n; i++) if (keep[i]) out.push(pts[i * 2], pts[i * 2 + 1]);
  return out;
}

// ---- Chaikin corner rounding -------------------------------------------
function chaikin(pts, closed) {
  const n = pts.length / 2;
  if (n < 3) return pts;
  const out = [];
  const add = (x, y) => out.push(Math.round(x * 4) / 4, Math.round(y * 4) / 4);
  if (closed) {
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const ax = pts[i * 2], ay = pts[i * 2 + 1];
      const bx = pts[j * 2], by = pts[j * 2 + 1];
      add(ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25);
      add(ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75);
    }
  } else {
    add(pts[0], pts[1]);
    for (let i = 0; i < n - 1; i++) {
      const ax = pts[i * 2], ay = pts[i * 2 + 1];
      const bx = pts[j2(i)], by = pts[j2(i) + 1];
      add(ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25);
      add(ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75);
    }
    add(pts[(n - 1) * 2], pts[(n - 1) * 2 + 1]);
  }
  return out;
  function j2(i) { return (i + 1) * 2; }
}

// ---- build the terrain object for a design ------------------------------
// grid/window come from terrarium.mjs. Produces the shape design.js expects.
export function buildTerrain(grid, w, h, win, windowKm) {
  let min = Infinity, max = -Infinity, minX = 0, minY = 0;
  let landMax = -Infinity, landMin = Infinity;
  let hasWater = false;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = grid[y * w + x];
      if (!Number.isFinite(v)) continue;
      if (v < min) min = v;
      if (v > max) { max = v; minX = x; minY = y; }
      if (v < 0) hasWater = true;
      if (v >= 0) { if (v > landMax) landMax = v; if (v < landMin) landMin = v; }
    }
  }
  if (!Number.isFinite(min)) {
    return { lines: [], interval: 0, minElev: 0, maxElev: 0, hiElev: null, hi: null, win, windowKm, flat: true };
  }

  const isLand = landMax > -Infinity;
  let interval, levels = [];
  if (isLand && landMax > 0) {
    const range = landMax - Math.max(0, landMin);
    interval = niceInterval(Math.max(range, 1));
    const first = Math.ceil(Math.max(0, landMin) / interval) * interval;
    for (let l = first + interval; l <= landMax; l += interval) levels.push(l);
    // very flat land: make sure at least a few lines exist
    if (levels.length < 3 && interval > 1) {
      interval = Math.max(1, Math.floor(interval / 5));
      levels = [];
      const f = Math.ceil(Math.max(0, landMin) / interval) * interval;
      for (let l = f + interval; l <= landMax; l += interval) levels.push(l);
    }
  } else if (hasWater) {
    // open water: show depth contours instead
    interval = niceInterval(-min);
    const f = Math.floor(min / interval) * interval;
    for (let l = f + interval; l < 0; l += interval) levels.push(l);
  } else {
    interval = 1;
  }

  const majorEvery = interval * 5;
  const lines = [];
  const addLevel = (level, major, coast) => {
    const segs = marchingSquares(grid, w, h, level);
    if (!segs.length) return;
    const polys = stitch(segs);
    for (let p of polys) {
      if (p.length / 2 < 6) continue; // specks
      p = rdp(p, 0.55);
      if (p.length / 2 < 4) continue;
      const closed = Math.hypot(p[0] - p[p.length - 2], p[1] - p[p.length - 1]) < 1.2;
      p = chaikin(p, closed);
      if (p.length / 2 < 4) continue;
      lines.push({ l: level, m: major ? 1 : 0, c: coast ? 1 : 0, p: quantize(p) });
    }
  };

  if (hasWater && isLand && landMax > 0 && min < 0) addLevel(0, false, true); // coastline
  for (const l of levels) addLevel(l, Math.abs(l % majorEvery) < 1e-9 && l !== 0, false);

  // cap total point count so the print file stays manageable
  let total = lines.reduce((n, l) => n + l.p.length / 2, 0);
  while (total > 140000 && lines.length) {
    lines.sort((a, b) => a.p.length - b.p.length);
    const dropped = lines.shift();
    total -= dropped.p.length / 2;
  }

  const flat = lines.length === 0;
  return {
    lines,
    interval: interval || 1,
    minElev: Math.round(min),
    maxElev: Math.round(max),
    hiElev: isLand ? Math.round(landMax) : null,
    hi: isLand ? [minX, minY] : null,
    win,
    windowKm,
    flat,
  };
}

function quantize(pts) {
  const out = new Array(pts.length);
  for (let i = 0; i < pts.length; i++) out[i] = Math.round(pts[i] * 4) / 4;
  return out;
}
