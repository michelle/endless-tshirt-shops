/**
 * Contour extraction (marching squares) + helpers.
 * Pure math — no DOM or Node APIs.
 */

/** Pick a "nice" interval (1/2/2.5/5 × 10^k) that yields ~targetLines contours. */
export function niceInterval(range: number, targetLines = 12): number {
  if (!(range > 0)) return 1;
  const raw = range / targetLines;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (m * pow >= raw) return m * pow;
  }
  return 10 * pow;
}

export function contourLevels(min: number, max: number): { levels: number[]; interval: number } {
  const range = max - min;
  if (range < 0.5) {
    // essentially flat — draw a single mid line so the print is never empty
    const mid = Math.round((min + max) / 2);
    return { levels: [mid], interval: 1 };
  }
  let interval = niceInterval(range, 16);
  // guard against absurd counts
  while (range / interval > 44) interval *= 2;
  const levels: number[] = [];
  const start = Math.ceil(min / interval) * interval;
  for (let l = start; l <= max; l += interval) {
    levels.push(Math.round(l * 1000) / 1000);
  }
  if (levels.length === 0) levels.push(Math.round((min + max) / 2));
  return { levels, interval };
}

type Pt = [number, number];

/**
 * Marching squares over an n×n grid.
 * Returns flat array [x1,y1,x2,y2, ...] in grid coordinates.
 */
export function marchingSquares(grid: Float32Array, n: number, level: number): Float32Array {
  const segs: number[] = [];

  for (let j = 0; j < n - 1; j++) {
    for (let i = 0; i < n - 1; i++) {
      const a = grid[j * n + i]; // top-left
      const b = grid[j * n + i + 1]; // top-right
      const c = grid[(j + 1) * n + i + 1]; // bottom-right
      const d = grid[(j + 1) * n + i]; // bottom-left

      let idx = 0;
      if (a > level) idx |= 8;
      if (b > level) idx |= 4;
      if (c > level) idx |= 2;
      if (d > level) idx |= 1;
      if (idx === 0 || idx === 15) continue;

      const iT = (): Pt => [i + (level - a) / (b - a || 1e-9), j];
      const iR = (): Pt => [i + 1, j + (level - b) / (c - b || 1e-9)];
      const iB = (): Pt => [i + (level - d) / (c - d || 1e-9), j + 1];
      const iL = (): Pt => [i, j + (level - a) / (d - a || 1e-9)];

      let pairs: Pt[][];
      switch (idx) {
        case 1: case 14: pairs = [[iL(), iB()]]; break;
        case 2: case 13: pairs = [[iB(), iR()]]; break;
        case 3: case 12: pairs = [[iL(), iR()]]; break;
        case 4: case 11: pairs = [[iT(), iR()]]; break;
        case 6: case 9: pairs = [[iT(), iB()]]; break;
        case 7: case 8: pairs = [[iT(), iL()]]; break;
        case 5: {
          const center = (a + b + c + d) / 4;
          pairs = center > level ? [[iT(), iR()], [iL(), iB()]] : [[iT(), iL()], [iB(), iR()]];
          break;
        }
        case 10: {
          const center = (a + b + c + d) / 4;
          pairs = center > level ? [[iT(), iL()], [iB(), iR()]] : [[iT(), iR()], [iL(), iB()]];
          break;
        }
        default:
          continue;
      }
      for (const [p1, p2] of pairs) {
        if (!Number.isFinite(p1[0]) || !Number.isFinite(p1[1]) || !Number.isFinite(p2[0]) || !Number.isFinite(p2[1])) continue;
        segs.push(p1[0], p1[1], p2[0], p2[1]);
      }
    }
  }
  return Float32Array.from(segs);
}
