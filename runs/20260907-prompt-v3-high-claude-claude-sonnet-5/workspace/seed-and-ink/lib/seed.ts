// Deterministic string -> 32-bit seed, and a seeded PRNG built on it.
// Same seed text always produces the same numeric seed and the same
// stream of "random" numbers, which is what lets us regenerate the exact
// same artwork on the server (for the print file) that the customer saw
// in the browser preview.

/** cyrb53-style string hash, folded to an unsigned 32-bit int. */
export function hashSeedText(text: string): number {
  let h1 = 0xdeadbeef ^ text.length;
  let h2 = 0x41c6ce57 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return ((h1 >>> 0) ^ (h2 >>> 0)) >>> 0;
}

/** mulberry32 PRNG - tiny, fast, deterministic given a 32-bit seed. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Human-friendly short numeric code derived from the seed text, shown to
 * the customer as their design's "serial number" (also printed on the
 * back, in a dot-matrix digit font so no alphabet glyphs are needed). */
export function seedCode(text: string): string {
  const n = hashSeedText(text || 'seed');
  const digits = String(n % 1_000_000_000).padStart(9, '0');
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

const ADJECTIVES = [
  'quiet', 'bright', 'wild', 'lucky', 'stubborn', 'restless', 'golden',
  'brave', 'curious', 'gentle', 'electric', 'vivid', 'silent', 'feral',
];
const NOUNS = [
  'comet', 'harbor', 'ember', 'thicket', 'signal', 'tide', 'orbit',
  'canyon', 'lantern', 'static', 'meadow', 'echo', 'ferry', 'kite',
];

/** Generates a random-but-memorable seed phrase for the "surprise me" button.
 * It's still just text - typing it back in reproduces the same design. */
export function randomSeedPhrase(): string {
  const bytes = new Uint32Array(3);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    bytes[0] = Math.floor(Math.random() * 2 ** 32);
    bytes[1] = Math.floor(Math.random() * 2 ** 32);
    bytes[2] = Math.floor(Math.random() * 2 ** 32);
  }
  const adj = ADJECTIVES[bytes[0] % ADJECTIVES.length];
  const noun = NOUNS[bytes[1] % NOUNS.length];
  const num = bytes[2] % 100;
  return `${adj}-${noun}-${num}`;
}
