/** Deterministic hashing + PRNG. Same input -> same glyph, forever. */

export function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export class Rng {
  private s: number;

  constructor(seed: number | string) {
    this.s = (typeof seed === "string" ? fnv1a(seed) : seed >>> 0) || 0x9e3779b9;
  }

  /** xorshift32 */
  next(): number {
    let x = this.s;
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    this.s = x;
    return x;
  }

  float(): number {
    return this.next() / 4294967296;
  }

  int(maxExclusive: number): number {
    return this.next() % maxExclusive;
  }

  pick<T>(items: readonly T[]): T {
    return items[this.int(items.length)];
  }

  bool(): boolean {
    return (this.next() & 1) === 1;
  }
}
