// Deterministic star-map generator.
//
// Given a date, a location and a title, this produces a unique, reproducible
// star field. The same inputs always produce the same sky, which is what lets
// us render an identical preview in the browser (SVG) and a print-ready PNG on
// the server for Prodigi.

export interface StarMapParams {
  date: string; // YYYY-MM-DD
  lat: number;
  lng: number;
  title: string;
  locationName: string;
  ink: "light" | "dark";
}

export interface Star {
  x: number; // 0..1 within the sky circle
  y: number; // 0..1 within the sky circle
  r: number; // radius in px (relative to a 1000px sky)
  alpha: number; // 0..1
  twinkle: number; // phase offset for subtle variation
}

export interface StarMap {
  stars: Star[];
  lines: [number, number][]; // pairs of star indices
  highlight: number; // index of the "your star" star
  seed: number;
}

// --- deterministic hashing / PRNG -------------------------------------------

function hashString(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- generation -------------------------------------------------------------

export function generateStarMap(params: StarMapParams): StarMap {
  const seed = hashString(
    `${params.date}|${params.lat.toFixed(4)}|${params.lng.toFixed(4)}|${params.title}|${params.locationName}`
  );
  const rand = mulberry32(seed);

  const STAR_COUNT = 520;

  const stars: Star[] = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    // Uniform distribution across the disc.
    const angle = rand() * Math.PI * 2;
    const radius = Math.sqrt(rand()); // sqrt for uniform area
    const x = 0.5 + Math.cos(angle) * radius * 0.5;
    const y = 0.5 + Math.sin(angle) * radius * 0.5;

    // Magnitude-like brightness: a few bright, many faint.
    const m = Math.pow(rand(), 2.6); // 0..1, skewed toward faint
    const brightness = 1 - m; // 1 = brightest
    const r = 0.6 + brightness * 3.4; // px radius
    const alpha = 0.25 + brightness * 0.75;
    const twinkle = rand() * Math.PI * 2;

    stars.push({ x, y, r, alpha, twinkle });
  }

  // Sort so the brightest stars are drawn last (on top).
  stars.sort((a, b) => a.alpha - b.alpha);

  // Pick a handful of bright stars to form a "constellation".
  const bright = stars
    .map((s, i) => ({ s, i }))
    .sort((a, b) => b.s.alpha - a.s.alpha)
    .slice(0, 9)
    .map((e) => e.i);

  // Connect them into a simple chain (nearest-neighbour path).
  const lines: [number, number][] = [];
  const used = new Set<number>();
  let current = bright[0];
  used.add(current);
  for (let k = 1; k < bright.length; k++) {
    let best = -1;
    let bestDist = Infinity;
    for (const cand of bright) {
      if (used.has(cand)) continue;
      const dx = stars[cand].x - stars[current].x;
      const dy = stars[cand].y - stars[current].y;
      const d = dx * dx + dy * dy;
      if (d < bestDist) {
        bestDist = d;
        best = cand;
      }
    }
    if (best >= 0) {
      lines.push([current, best]);
      used.add(best);
      current = best;
    }
  }

  // The "your star" is the single brightest star.
  const highlight = bright[0];

  return { stars, lines, highlight, seed };
}
