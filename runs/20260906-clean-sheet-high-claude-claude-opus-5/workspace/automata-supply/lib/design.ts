/** The canonical description of one printable shirt, plus its URL encoding. */

export type InkId = "bone" | "ember" | "signal" | "moss" | "carbon" | "iron" | "vine";
export type Seeding = "single" | "random";

export type Ink = {
  id: InkId;
  name: string;
  /** Two RGB stops; the ramp runs top-to-bottom across generations. */
  stops: [[number, number, number], [number, number, number]];
  /** Reads well on dark garments (true) or light ones (false). */
  forDark: boolean;
};

export const INKS: Record<InkId, Ink> = {
  bone: {
    id: "bone",
    name: "Bone",
    stops: [[247, 245, 240], [247, 245, 240]],
    forDark: true,
  },
  ember: {
    id: "ember",
    name: "Ember",
    stops: [[255, 216, 122], [200, 30, 45]],
    forDark: true,
  },
  signal: {
    id: "signal",
    name: "Signal",
    stops: [[126, 249, 255], [147, 51, 234]],
    forDark: true,
  },
  moss: {
    id: "moss",
    name: "Moss",
    stops: [[214, 250, 200], [21, 128, 61]],
    forDark: true,
  },
  carbon: {
    id: "carbon",
    name: "Carbon",
    stops: [[24, 24, 27], [24, 24, 27]],
    forDark: false,
  },
  iron: {
    id: "iron",
    name: "Iron",
    stops: [[124, 124, 134], [18, 18, 22]],
    forDark: false,
  },
  vine: {
    id: "vine",
    name: "Vine",
    stops: [[109, 168, 20], [18, 42, 6]],
    forDark: false,
  },
};

export const INK_LIST = Object.values(INKS);

/** Garment colours we stock, mapped to Prodigi's `colour` attribute values. */
export type Garment = {
  id: string;
  name: string;
  /** Prodigi attribute value for GLOBAL-TEE-GIL-64000. */
  prodigi: string;
  /** Approximate fabric colour, for the on-site mockup. */
  hex: string;
  dark: boolean;
};

export const GARMENTS: Garment[] = [
  { id: "black", name: "Black", prodigi: "black", hex: "#141416", dark: true },
  { id: "navy", name: "Navy", prodigi: "navy blue", hex: "#1f2a44", dark: true },
  { id: "forest", name: "Forest", prodigi: "forest green", hex: "#22372b", dark: true },
  { id: "maroon", name: "Maroon", prodigi: "maroon", hex: "#4a1f2a", dark: true },
  { id: "charcoal", name: "Charcoal", prodigi: "charcoal", hex: "#3a3d40", dark: true },
  { id: "sport-grey", name: "Sport Grey", prodigi: "sport grey", hex: "#b6b6b2", dark: false },
  { id: "natural", name: "Natural", prodigi: "natural", hex: "#e7dfcc", dark: false },
  { id: "white", name: "White", prodigi: "white", hex: "#f6f6f4", dark: false },
];

export const GARMENT_BY_ID = Object.fromEntries(GARMENTS.map((g) => [g.id, g]));

export type SizeId = "xs" | "s" | "m" | "l" | "xl" | "2xl" | "3xl";

export const SIZES: { id: SizeId; label: string }[] = [
  { id: "xs", label: "XS" },
  { id: "s", label: "S" },
  { id: "m", label: "M" },
  { id: "l", label: "L" },
  { id: "xl", label: "XL" },
  { id: "2xl", label: "2XL" },
  { id: "3xl", label: "3XL" },
];

export const SIZE_IDS = SIZES.map((s) => s.id);

export type Design = {
  rule: number;
  seed: string;
  seeding: Seeding;
  ink: InkId;
  /** Cells across the artwork; also fixes the number of generations. */
  cells: number;
};

export const DEFAULT_CELLS = 121;
export const MIN_CELLS = 61;
export const MAX_CELLS = 201;

export function clampCells(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_CELLS;
  const r = Math.round(n);
  // Odd widths keep a true centre cell for single-cell seeding.
  const odd = r % 2 === 0 ? r + 1 : r;
  return Math.min(MAX_CELLS, Math.max(MIN_CELLS, odd));
}

const SEED_ALPHABET = "0123456789ABCDEF";

export function randomSeed(): string {
  let s = "";
  for (let i = 0; i < 6; i++) {
    s += SEED_ALPHABET[Math.floor(Math.random() * SEED_ALPHABET.length)];
  }
  return s;
}

export function normalizeSeed(raw: string | null | undefined): string {
  const cleaned = (raw ?? "").toUpperCase().replace(/[^0-9A-F]/g, "").slice(0, 6);
  return cleaned.padStart(6, "0");
}

export function isInk(v: string): v is InkId {
  return Object.prototype.hasOwnProperty.call(INKS, v);
}

export function isSize(v: string): v is SizeId {
  return (SIZE_IDS as string[]).includes(v);
}

/** Parse a design out of query params, falling back to safe defaults. */
export function designFromParams(p: URLSearchParams | Record<string, string | undefined>): Design {
  const get = (k: string) =>
    p instanceof URLSearchParams ? p.get(k) : (p[k] ?? null);

  const ruleRaw = Number(get("rule"));
  const rule = Number.isFinite(ruleRaw) ? Math.min(255, Math.max(0, Math.round(ruleRaw))) : 30;

  const seedingRaw = get("seeding");
  const seeding: Seeding = seedingRaw === "single" ? "single" : "random";

  const inkRaw = (get("ink") ?? "bone").toLowerCase();
  const ink: InkId = isInk(inkRaw) ? inkRaw : "bone";

  return {
    rule,
    seed: normalizeSeed(get("seed") ?? "000001"),
    seeding,
    ink,
    cells: clampCells(Number(get("cells") ?? DEFAULT_CELLS)),
  };
}

export function designToParams(d: Design): string {
  return new URLSearchParams({
    rule: String(d.rule),
    seed: d.seed,
    seeding: d.seeding,
    ink: d.ink,
    cells: String(d.cells),
  }).toString();
}

/** Compact, delimiter-safe encoding used inside Stripe metadata. */
export function encodeLineItem(
  d: Design,
  size: SizeId,
  garmentId: string,
  qty: number,
): string {
  return [d.rule, d.seed, d.seeding === "single" ? "1" : "r", d.ink, d.cells, size, garmentId, qty].join(
    "~",
  );
}

export function decodeLineItem(
  s: string,
): { design: Design; size: SizeId; garmentId: string; qty: number } | null {
  const parts = s.split("~");
  if (parts.length !== 8) return null;
  const [rule, seed, seeding, ink, cells, size, garmentId, qty] = parts;
  if (!isInk(ink) || !isSize(size) || !GARMENT_BY_ID[garmentId]) return null;
  const n = Number(qty);
  if (!Number.isFinite(n) || n < 1 || n > 10) return null;
  return {
    design: {
      rule: Math.min(255, Math.max(0, Number(rule) || 0)),
      seed: normalizeSeed(seed),
      seeding: seeding === "1" ? "single" : "random",
      ink,
      cells: clampCells(Number(cells)),
    },
    size,
    garmentId,
    qty: n,
  };
}

export function designTitle(d: Design): string {
  return `Rule ${String(d.rule).padStart(3, "0")}`;
}

export function designSubtitle(d: Design): string {
  return d.seeding === "single" ? "Single cell" : `Seed ${d.seed}`;
}

/** Inks are picked to contrast with the garment, not to sit invisibly on it. */
export function inksForGarment(garmentId: string): Ink[] {
  const g = GARMENT_BY_ID[garmentId];
  const wantDark = g ? g.dark : true;
  return INK_LIST.filter((i) => i.forDark === wantDark);
}

export function inkFitsGarment(ink: InkId, garmentId: string): boolean {
  const g = GARMENT_BY_ID[garmentId];
  if (!g) return true;
  return INKS[ink].forDark === g.dark;
}
