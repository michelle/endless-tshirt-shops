// Deterministic hashing + PRNG + value noise.
// Same word in, same art out — on every machine, forever.

export function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

export function sfc32(a: number, b: number, c: number, d: number): () => number {
  return () => {
    a |= 0; b |= 0; c |= 0; d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

export function rngFromSeed(seed: string): () => number {
  const h = xmur3(seed);
  return sfc32(h(), h(), h(), h());
}

// Seeded 2-D value noise with a permutation grid, smoothstep interpolated.
export function makeNoise2D(seed: string): (x: number, y: number) => number {
  const rand = rngFromSeed(seed);
  const SIZE = 256;
  const values = new Float32Array(SIZE * SIZE);
  for (let i = 0; i < values.length; i++) values[i] = rand();
  const at = (ix: number, iy: number) =>
    values[((iy & 255) << 8) | (ix & 255)];
  const smooth = (t: number) => t * t * (3 - 2 * t);
  return (x: number, y: number) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = smooth(x - ix);
    const fy = smooth(y - iy);
    const v00 = at(ix, iy);
    const v10 = at(ix + 1, iy);
    const v01 = at(ix, iy + 1);
    const v11 = at(ix + 1, iy + 1);
    const top = v00 + (v10 - v00) * fx;
    const bottom = v01 + (v11 - v01) * fx;
    return top + (bottom - top) * fy; // 0..1
  };
}
