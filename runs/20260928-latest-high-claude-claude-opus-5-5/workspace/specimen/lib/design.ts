import { SHIRT_COLORS, SIZES } from "./catalog";

// A Design is everything needed to deterministically render one shirt.
// It is small enough to live in Stripe product metadata, so paid orders carry their own artwork spec.

export const KINDS = [
  { id: "moth", label: "Moth", order: "Lepidoptera" },
  { id: "butterfly", label: "Butterfly", order: "Lepidoptera" },
  { id: "beetle", label: "Beetle", order: "Coleoptera" },
] as const;
export type Kind = (typeof KINDS)[number]["id"];

export const TRAITS = [
  { id: "nocturnus", label: "Night owl", adj: "Night-Flying" },
  { id: "caffeinophilus", label: "Runs on coffee", adj: "Espresso" },
  { id: "procrastinans", label: "Does it tomorrow", adj: "Tomorrow" },
  { id: "esuriens", label: "Always snacking", adj: "Snacking" },
  { id: "canophilus", label: "Loves dogs", adj: "Dog-Loving" },
  { id: "felinophilus", label: "Cat person", adj: "Cat-Loving" },
  { id: "vagabundus", label: "Wanderer", adj: "Wandering" },
  { id: "loquax", label: "Chatterbox", adj: "Chattering" },
  { id: "somnolentus", label: "Champion napper", adj: "Drowsy" },
  { id: "saltator", label: "Dances anywhere", adj: "Dancing" },
  { id: "cantator", label: "Sings in the shower", adj: "Singing" },
  { id: "bibliophilus", label: "Bookworm", adj: "Bookish" },
  { id: "hortulanus", label: "Plant parent", adj: "Green-Thumbed" },
  { id: "frigidus", label: "Always cold", adj: "Shivering" },
  { id: "matutinus", label: "Morning person", adj: "Early-Rising" },
  { id: "ludens", label: "Gamer", adj: "Playful" },
  { id: "cursor", label: "Runner", adj: "Swift" },
  { id: "coquus", label: "Home chef", adj: "Kitchen" },
  { id: "gloriosus", label: "Simply magnificent", adj: "Magnificent" },
] as const;
export type TraitId = (typeof TRAITS)[number]["id"];

export const STATUSES = [
  { id: "DD", label: "Data Deficient (Mysterious)" },
  { id: "LC", label: "Least Concern" },
  { id: "NT", label: "Near Threatening" },
  { id: "VU", label: "Vulnerable to Puns" },
  { id: "EN", label: "Endangered (Emotionally)" },
  { id: "CR", label: "Critically Adorable" },
] as const;
export type StatusId = (typeof STATUSES)[number]["id"];

export const PALETTE_IDS = [
  "luna", "monarch", "morpho", "atlas", "rosy", "emperor", "jewel", "ember", "ghost", "wild",
] as const;
export type PaletteId = (typeof PALETTE_IDS)[number];

export type Design = {
  v: 1;
  seed: number; // variant seed: "Mutate" picks a new one
  kind: Kind;
  palette: PaletteId;
  name: string; // the subject: a person, a pet, a friend
  genus: string; // Latinised name, suggested from `name`, editable
  trait: TraitId;
  habitat: string;
  diet: string;
  call: string;
  status: StatusId;
  marks: [string, string, string];
  year: string;
  color: string; // shirt color id
  size: string; // size id
};

export const LIMITS = {
  name: 16,
  genus: 18,
  habitat: 32,
  diet: 32,
  call: 32,
  mark: 40,
} as const;

export const DEFAULT_DESIGN: Design = {
  v: 1,
  seed: 20260928,
  kind: "moth",
  palette: "luna",
  name: "Maria",
  genus: "Mariella",
  trait: "nocturnus",
  habitat: "Kitchen, near the snacks",
  diet: "Iced coffee & gossip",
  call: "Wait, what?",
  status: "CR",
  marks: ["Laughs at own jokes", "Always slightly cold", "Knows every dog by name"],
  year: "1994",
  color: "natural",
  size: "m",
};

const GENUS_SUFFIXES = ["ella", "us", "opsis", "ia", "odes", "ina", "ura"];

export function genusSuggestions(name: string): string[] {
  const letters = stripDiacritics(name).replace(/[^A-Za-z]/g, "").toLowerCase();
  if (!letters) return ["Anonymus"];
  let stem = letters.replace(/[aeiouy]+$/, "");
  if (stem.length < 2) stem = letters;
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return GENUS_SUFFIXES.map((suf) => cap(stem + suf).slice(0, LIMITS.genus));
}

function stripDiacritics(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Latin adjective agreement, so "Mariella" gets "nocturna" and "Gregus" gets "nocturnus".
export function epithetFor(genus: string, trait: TraitId): string {
  const feminine = /(a|opsis)$/i.test(genus);
  if (feminine && trait.endsWith("us")) return trait.slice(0, -2) + "a";
  return trait;
}

export function familyFor(genus: string): string {
  const stem = genus.replace(/(ella|opsis|odes|us|ia|ina|ura|a|e|i|o|u|y)$/i, "");
  return (stem.length >= 2 ? stem : genus) + "idae";
}

export const traitById = (id: string) => TRAITS.find((t) => t.id === id);
export const statusById = (id: string) => STATUSES.find((s) => s.id === id);
export const kindById = (id: string) => KINDS.find((k) => k.id === id);

// ---------- validation / sanitising (used server-side on every request) ----------

function cleanText(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v
    .normalize("NFC")
    // Keep to scripts our print fonts cover (Latin, Greek, Cyrillic + common punctuation);
    // anything else (emoji, control chars, bidi overrides) would print as missing glyphs.
    .replace(/[^ -~ -ɏͰ-ϿЀ-ӿḀ-ỿ‐-…€™]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export class DesignError extends Error {}

export function validateDesign(input: unknown): Design {
  if (!input || typeof input !== "object") throw new DesignError("Missing design");
  const d = input as Record<string, unknown>;
  const pickEnum = <T extends string>(v: unknown, allowed: readonly T[], field: string): T => {
    if (typeof v === "string" && (allowed as readonly string[]).includes(v)) return v as T;
    throw new DesignError(`Invalid ${field}`);
  };
  const seed = Number(d.seed);
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new DesignError("Invalid seed");
  const name = cleanText(d.name, LIMITS.name);
  if (!name) throw new DesignError("Please enter a name for your specimen");
  let genus = cleanText(d.genus, LIMITS.genus).replace(/[^A-Za-z]/g, "");
  if (!genus) genus = genusSuggestions(name)[0];
  genus = genus.charAt(0).toUpperCase() + genus.slice(1).toLowerCase();
  const marksIn = Array.isArray(d.marks) ? d.marks : [];
  const marks = [0, 1, 2].map((i) => cleanText(marksIn[i], LIMITS.mark)) as [string, string, string];
  const year = cleanText(d.year, 4).replace(/[^0-9]/g, "");
  return {
    v: 1,
    seed,
    kind: pickEnum(d.kind, KINDS.map((k) => k.id), "kind"),
    palette: pickEnum(d.palette, PALETTE_IDS, "palette"),
    name,
    genus,
    trait: pickEnum(d.trait, TRAITS.map((t) => t.id), "trait"),
    habitat: cleanText(d.habitat, LIMITS.habitat),
    diet: cleanText(d.diet, LIMITS.diet),
    call: cleanText(d.call, LIMITS.call).replace(/^["“”']+|["“”']+$/g, ""),
    status: pickEnum(d.status, STATUSES.map((s) => s.id), "status"),
    marks,
    year: year.length === 4 ? year : String(new Date().getFullYear()),
    color: pickEnum(d.color, SHIRT_COLORS.map((c) => c.id), "shirt color"),
    size: pickEnum(d.size, SIZES.map((s) => s.id), "size"),
  };
}

// ---------- Stripe metadata <-> Design ----------
// Each field gets its own metadata key (Stripe limits values to 500 chars).

export function designToMetadata(d: Design): Record<string, string> {
  return {
    d_v: String(d.v),
    d_seed: String(d.seed),
    d_kind: d.kind,
    d_palette: d.palette,
    d_name: d.name,
    d_genus: d.genus,
    d_trait: d.trait,
    d_habitat: d.habitat,
    d_diet: d.diet,
    d_call: d.call,
    d_status: d.status,
    d_mark1: d.marks[0],
    d_mark2: d.marks[1],
    d_mark3: d.marks[2],
    d_year: d.year,
    d_color: d.color,
    d_size: d.size,
  };
}

export function designFromMetadata(m: Record<string, string>): Design {
  return validateDesign({
    seed: Number(m.d_seed),
    kind: m.d_kind,
    palette: m.d_palette,
    name: m.d_name,
    genus: m.d_genus,
    trait: m.d_trait,
    habitat: m.d_habitat,
    diet: m.d_diet,
    call: m.d_call,
    status: m.d_status,
    marks: [m.d_mark1, m.d_mark2, m.d_mark3],
    year: m.d_year,
    color: m.d_color,
    size: m.d_size,
  });
}

// ---------- compact URL encoding (for preview image URLs) ----------

export function encodeDesignParam(d: Design): string {
  const json = JSON.stringify(d);
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeDesignParam(s: string): Design {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return validateDesign(JSON.parse(new TextDecoder().decode(bytes)));
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}
