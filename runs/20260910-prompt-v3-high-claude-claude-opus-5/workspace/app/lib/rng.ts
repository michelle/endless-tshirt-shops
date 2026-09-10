// Deterministic, dependency-free PRNG utilities.
// The same input string must always produce the same specimen — on the client
// preview and in the server-side print renderer.

export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export type Rng = {
  next: () => number;
  range: (min: number, max: number) => number;
  int: (min: number, max: number) => number;
  pick: <T>(arr: readonly T[]) => T;
  chance: (p: number) => boolean;
  gauss: () => number;
};

export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const range = (min: number, max: number) => min + next() * (max - min);
  return {
    next,
    range,
    int: (min: number, max: number) => Math.floor(range(min, max + 1 - 1e-9)),
    pick: <T,>(arr: readonly T[]) => arr[Math.floor(next() * arr.length) % arr.length],
    chance: (p: number) => next() < p,
    gauss: () => {
      // Irwin-Hall approximation, centred on 0, roughly unit variance.
      let s = 0;
      for (let i = 0; i < 4; i++) s += next();
      return (s - 2) * 0.866;
    },
  };
}
