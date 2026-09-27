// Store concept: "DEFINING ME" - a custom dictionary-definition tee.
// Every shirt is generated from the customer's word (usually a name),
// an auto-written (or customer-written) definition, and an example sentence.

export const PRODUCT_NAME = "The Definition Tee";
export const BRAND_NAME = "DEFINING.ME";
export const SHIRT_PRICE_CENTS = 3400;
export const SHIPPING_CENTS = 495;
export const SKU = "GLOBAL-TEE-BC-3001";

export interface ColorSpec {
  id: string;
  label: string;
  hex: string;
  dark: boolean;
  prodigi: string;
}

export const SIZES = ["xs", "s", "m", "l", "xl", "2xl", "3xl", "4xl"] as const;
export type Size = (typeof SIZES)[number];

export const COLORS: ColorSpec[] = [
  { id: "black", label: "Black", hex: "#1a1a1d", dark: true, prodigi: "black" },
  { id: "white", label: "White", hex: "#f4f3ef", dark: false, prodigi: "white" },
  { id: "navy", label: "Navy", hex: "#212c49", dark: true, prodigi: "navy blue" },
  { id: "heather", label: "Athletic Heather", hex: "#a3a6ab", dark: false, prodigi: "athletic grey heather" },
  { id: "ash", label: "Ash", hex: "#e4e2dc", dark: false, prodigi: "ash" },
  { id: "cream", label: "Cream", hex: "#efe5cd", dark: false, prodigi: "cream" },
  { id: "maroon", label: "Maroon", hex: "#5a1f2a", dark: true, prodigi: "maroon" },
  { id: "burgundy", label: "Burgundy", hex: "#4a1626", dark: true, prodigi: "burgundy" },
  { id: "kelly", label: "Kelly Green", hex: "#1e7a45", dark: true, prodigi: "kelly green" },
  { id: "royal", label: "Royal Blue", hex: "#22447a", dark: true, prodigi: "royal blue" },
  { id: "pink", label: "Pink", hex: "#e9b6c6", dark: false, prodigi: "pink" },
  { id: "natural", label: "Natural", hex: "#e8dcc3", dark: false, prodigi: "natural" },
];

export const ACCENTS = [
  { id: "gold", label: "Antique Gold", hex: "#b8862d" },
  { id: "rust", label: "Rust", hex: "#a9502f" },
  { id: "sage", label: "Sage", hex: "#6d7d55" },
  { id: "plum", label: "Plum", hex: "#6d4a6e" },
  { id: "steel", label: "Steel Blue", hex: "#3f5f7f" },
] as const;

export const PARTS_OF_SPEECH = [
  "noun",
  "person",
  "legend",
  "icon",
  "phenomenon",
  "masterpiece",
  "vibe",
] as const;

export function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

const DEFINITION_TEMPLATES: { def: string; ex: string }[] = [
  {
    def: "1. A person whose presence immediately improves any room, playlist, or group chat. 2. [informal] the main character.",
    ex: "\u201CDid you see {w} today? Iconic, as usual.\u201D",
  },
  {
    def: "1. Someone who says \u201Cone more episode\u201D and means four. 2. Keeper of the good snacks.",
    ex: "\u201CClassic {w} \u2014 five minutes late and worth every one of them.\u201D",
  },
  {
    def: "1. A rare variety of human, distinguished by sharp wit and a questionable sleep schedule.",
    ex: "\u201CNobody proofreads like {w}.\u201D",
  },
  {
    def: "1. An unstoppable force of nature; often found near coffee. 2. [plural] see: main-character energy.",
    ex: "\u201C{w} walked in and the whole meeting improved.\u201D",
  },
  {
    def: "1. The friend who always has a plan, a charger, and an opinion. 2. A source of unusually good advice.",
    ex: "\u201CText {w}. {w} will know what to do.\u201D",
  },
  {
    def: "1. A professional overthinker with flawless results. 2. A certified day-maker.",
    ex: "\u201COf course {w} already thought of that.\u201D",
  },
];

export function autoDefinition(word: string): string {
  const t = DEFINITION_TEMPLATES[hashString(word.toLowerCase()) % DEFINITION_TEMPLATES.length];
  return t.def.replace(/\{w\}/g, word);
}

export function autoExample(word: string): string {
  const t = DEFINITION_TEMPLATES[hashString(word.toLowerCase()) % DEFINITION_TEMPLATES.length];
  return t.ex.replace(/\{w\}/g, word);
}

export function editionNumber(word: string, definition: string): string {
  return String((hashString(`${word.toLowerCase()}|${definition}`) % 9000) + 100).padStart(4, "0");
}

export function inkForColor(color: ColorSpec): string {
  return color.dark ? "#f2ead8" : "#26221e";
}

export interface DesignInput {
  word: string;
  pos: string;
  definition: string;
  example: string;
  year: number | null;
  size: Size;
  color: string; // color id
  accent: string; // accent id
}

const WORD_RE = /^[A-Za-z][A-Za-z' -]{0,15}$/;
const CURRENT_YEAR = new Date().getFullYear();

function cleanText(s: unknown, max: number): string {
  return String(s ?? "")
    .replace(/[\u0000-\u001F\u007F<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function sanitizeDesign(raw: unknown): DesignInput {
  const r = (raw ?? {}) as Record<string, unknown>;
  const word = cleanText(r.word, 16).replace(/\u2019/g, "'");
  if (!WORD_RE.test(word)) {
    throw new Error("Word must be 1-16 letters (spaces, hyphens and apostrophes ok).");
  }
  const pos = (PARTS_OF_SPEECH as readonly string[]).includes(String(r.pos))
    ? String(r.pos)
    : "noun";
  let definition = cleanText(r.definition, 190);
  let example = cleanText(r.example, 130);
  if (!definition) definition = autoDefinition(word);
  if (!example) example = autoExample(word);
  let year: number | null = null;
  if (r.year !== null && r.year !== undefined && String(r.year).trim() !== "") {
    const y = Number(r.year);
    if (!Number.isInteger(y) || y < 1900 || y > CURRENT_YEAR) {
      throw new Error(`Year must be between 1900 and ${CURRENT_YEAR}.`);
    }
    year = y;
  }
  const size = (SIZES as readonly string[]).includes(String(r.size)) ? (r.size as Size) : "m";
  const color = COLORS.some((c) => c.id === r.color) ? String(r.color) : "black";
  const accent = ACCENTS.some((a) => a.id === r.accent) ? String(r.accent) : "gold";
  return { word, pos, definition, example, year, size, color, accent };
}

export function colorById(id: string): ColorSpec {
  return COLORS.find((c) => c.id === id) ?? COLORS[0];
}

export function accentById(id: string): { id: string; label: string; hex: string } {
  return (
    (ACCENTS as readonly { id: string; label: string; hex: string }[]).find(
      (a) => a.id === id
    ) ?? ACCENTS[0]
  );
}

export function sizeLabel(size: Size): string {
  return size.toUpperCase();
}
