/** Elementary cellular automata — the engine behind every design we print. */

/** FNV-1a, so a seed string maps to a stable 32-bit state on any runtime. */
export function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 — small, fast, and identical in the browser and on the server. */
export function rng(state: number): () => number {
  let a = state || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Seeding = "single" | "random";

/**
 * Evolve `rule` for `height` generations across `width` cells on a ring.
 * Returns one Uint8Array of 0/1 per generation, oldest first.
 */
export function evolve(
  rule: number,
  width: number,
  height: number,
  seed: string,
  seeding: Seeding,
  density = 0.5,
): Uint8Array[] {
  const lut = new Uint8Array(8);
  for (let i = 0; i < 8; i++) lut[i] = (rule >> i) & 1;

  let row = new Uint8Array(width);
  if (seeding === "single") {
    row[width >> 1] = 1;
  } else {
    const rand = rng(hashSeed(seed));
    for (let i = 0; i < width; i++) row[i] = rand() < density ? 1 : 0;
  }

  const rows: Uint8Array[] = [row];
  for (let g = 1; g < height; g++) {
    const next = new Uint8Array(width);
    for (let i = 0; i < width; i++) {
      // Wrap the edges so the pattern reads as continuous cloth, not a
      // rectangle with dead margins.
      const l = row[(i - 1 + width) % width];
      const c = row[i];
      const r = row[(i + 1) % width];
      next[i] = lut[(l << 2) | (c << 1) | r];
    }
    rows.push(next);
    row = next;
  }
  return rows;
}

/** Share of live cells — used to reject seeds that evolve into a blank shirt. */
export function density(rows: Uint8Array[]): number {
  let live = 0;
  let total = 0;
  for (const r of rows) {
    total += r.length;
    for (let i = 0; i < r.length; i++) live += r[i];
  }
  return total === 0 ? 0 : live / total;
}
