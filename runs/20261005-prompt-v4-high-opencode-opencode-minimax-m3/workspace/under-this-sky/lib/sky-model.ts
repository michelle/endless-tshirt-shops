// lib/sky-model.ts
// Deterministic procedural star field. Given (date+location) we seed a
// PRNG so the same inputs always produce the same star pattern — it's
// nice that re-ordering a shirt produces the identical print, but not
// the same field as someone else's.

/** Mulberry32 PRNG: tiny, fast, deterministic, plenty random for visuals. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Hash the (date+lat+lng) string into a 32-bit unsigned int to use as a seed.
 * Uses FNV-1a, good enough for visual purposes.
 */
export function hashSeed(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export interface FakeStar {
  /** polar angle on the celestial-sphere disc (radians, 0..2π) */
  theta: number;
  /** signed declination (-π/2..π/2) */
  dec: number;
  /** visual magnitude 0 (bright) .. 5 (dim) */
  magnitude: number;
  /** size, in SVG units */
  size: number;
  /** star temperature 0..1 (cool=blue, hot=gold) */
  warmth: number;
}

const STAR_COUNT = 280;

/** Returns up to `count` dots scattered in (RA, dec). Cool, deterministic. */
export function proceduralStars(seedKey: string, count = STAR_COUNT): FakeStar[] {
  const rand = mulberry32(hashSeed(seedKey));
  const stars: FakeStar[] = [];
  for (let i = 0; i < count; i++) {
    // Uniform on sphere (sphere-projection via acos(uniform)).
    const u = rand();
    const dec = Math.acos(2 * u - 1) - Math.PI / 2;
    const theta = rand() * Math.PI * 2;
    // Magnitude distribution: many dim, few bright.
    const mRand = rand();
    const magnitude = mRand < 0.04 ? rand() * 1.2 : 1.2 + rand() * 4;
    const size = Math.max(0.7, 2.6 - magnitude * 0.5);
    const warmth = rand();
    stars.push({ theta, dec, magnitude, size, warmth });
  }
  return stars;
}

/**
 * Eight brightest stars in the procedural field, linked with thin dashed
 * polygonal chains to suggest the outline of a constellation without ever
 * pretending to be a specific one. We deliberately provide neither NGC nor
 * Bayer names — the print is the celestial *impression* of a moment.
 */
export interface ConstellationEdge {
  a: number;
  b: number;
}

export function constellationEdges(stars: FakeStar[]): ConstellationEdge[] {
  const ordered = [...stars]
    .map((s, idx) => ({ s, idx }))
    .sort((a, b) => a.s.magnitude - b.s.magnitude)
    .slice(0, 8);
  const edges: ConstellationEdge[] = [];
  const used = new Set<number>();
  // Link each of the 8 in order to the next, forming a closed loop.
  for (let i = 0; i < ordered.length; i++) {
    const a = ordered[i].idx;
    const b = ordered[(i + 1) % ordered.length].idx;
    used.add(a);
    used.add(b);
    edges.push({ a, b });
  }
  // A couple of cross-bars to feel like constellation lines without copying
  // any single real-world constellation. The seam positions are deterministic
  // — reordering the same shirt gets the same lines.
  if (ordered.length >= 4) {
    edges.push({ a: ordered[2].idx, b: ordered[5].idx });
  }
  return edges;
}
