/** Turns a customer's five answers into a fully specified creature plus all
 *  the copy that goes on the plate. Pure and deterministic: same answers in,
 *  byte-identical artwork out, forever. */

import { Rng, hashString } from "./rng";
import { CryptidSpec, TEMPERAMENTS, TemperamentId, specSeed } from "./spec";

export type Archetype = "lanky" | "hulk" | "crawler" | "wisp" | "coiled" | "plumed";

export type Palette = {
  name: string;
  hide: string;
  shade: string;
  accent: string;
  pop: string;
};

export const PALETTES: Palette[] = [
  { name: "Rust", hide: "#C4552E", shade: "#8B3A21", accent: "#F0D9A8", pop: "#2E6B62" },
  { name: "Moss", hide: "#6E8C4A", shade: "#45602E", accent: "#E8DFC0", pop: "#B4462E" },
  { name: "Indigo", hide: "#3E5C8A", shade: "#27395B", accent: "#E6D8B8", pop: "#D9873F" },
  { name: "Bone", hide: "#C9B99A", shade: "#93805F", accent: "#3A3630", pop: "#A33B2E" },
  { name: "Plum", hide: "#6E4467", shade: "#472B45", accent: "#E9D3B0", pop: "#C9A227" },
  { name: "Verdigris", hide: "#2F7268", shade: "#1C4A45", accent: "#EBDCB6", pop: "#D4623C" },
  { name: "Ember", hide: "#B8443F", shade: "#7C2A29", accent: "#F1DDB4", pop: "#3D6B78" },
  { name: "Sulphur", hide: "#C09328", shade: "#87661A", accent: "#2F2B26", pop: "#7A3B6B" },
];

export type Genome = {
  archetype: Archetype;
  eyes: number;
  eyeStyle: "pupil" | "slit" | "void" | "ring";
  horns: "none" | "spikes" | "antlers" | "curl" | "crown" | "single";
  mouth: "grin" | "line" | "gape" | "tiny";
  tail: "none" | "whip" | "tuft" | "spade" | "fork";
  wings: "none" | "bat" | "moth" | "stub";
  markings: "none" | "spots" | "stripes" | "bands" | "stars";
  frills: boolean;
  palette: Palette;
  /** Per-vertex radius jitter for the body blob. */
  wobble: number[];
  limbWobble: number[];
  lean: number;
  stoop: number;
  scale: number;
};

export type Cryptid = {
  spec: CryptidSpec;
  genome: Genome;
  commonName: string;
  binomial: string;
  alias: string;
  notes: string;
  stats: { label: string; value: string }[];
  danger: number;
  /** Drives the scale-reference figure on the plate. */
  heightM: number;
  plateNo: string;
  specimenId: string;
  firstSighted: string;
  activeWindow: string;
  temperamentLabel: string;
};

/* ------------------------------------------------------------------ */
/* Word pools                                                          */
/* ------------------------------------------------------------------ */

const ADJECTIVES: Record<TemperamentId, string[]> = {
  skittish: ["Fretful", "Startled", "Skittering", "Wary", "Flinching", "Hurried"],
  vengeful: ["Patient", "Slighted", "Unforgiving", "Owed", "Bitter", "Bookkeeping"],
  melancholic: ["Wistful", "Sighing", "Hollow", "Mourning", "Faded", "Long-Waiting"],
  mischievous: ["Grinning", "Meddling", "Pilfering", "Crooked", "Snickering", "Sly"],
  devoted: ["Faithful", "Shadowing", "Steadfast", "Sworn", "Clinging", "Watchful"],
  feral: ["Ravening", "Bristling", "Untaught", "Snarling", "Unhoused", "Wild-Hearted"],
};

const ARCH_NOUNS: Record<Archetype, string[]> = {
  lanky: ["Longshanks", "Stilt-Walker", "Reacher", "Lath", "Tall Quiet"],
  hulk: ["Lumberer", "Heap", "Thickset", "Hunkerer", "Slow Bulk"],
  crawler: ["Skitterer", "Underfoot", "Creeper", "Many-Legs", "Floorboard"],
  wisp: ["Drifter", "Pale One", "Hush", "Vapour", "Landing-Light"],
  coiled: ["Coil", "Windabout", "Knot", "Loop", "Draught"],
  plumed: ["Roost", "Plume", "Perch-Sitter", "Rag-Wing", "Gutter-Bird"],
};

const GENERA: Record<Archetype, string[]> = {
  lanky: ["Longimanus", "Gracilumbra", "Filiforma"],
  hulk: ["Ponderox", "Grandimolis", "Saxumbra"],
  crawler: ["Multipedis", "Scutigerax", "Reptovagus"],
  wisp: ["Nebulon", "Vaporax", "Umbraflos"],
  coiled: ["Anguisomnus", "Spiralumbra", "Volutus"],
  plumed: ["Plumavox", "Corvidens", "Pennatrix"],
};

const ROLES = [
  "Thief", "Hoarder", "Keeper", "Glutton", "Warden", "Collector",
  "Nibbler", "Reveller", "Squatter", "Auditor", "Sommelier", "Curator",
];

const EPITHET_SUFFIX = ["ii", "ensis", "ae", "ianus", "orum", "icola"];

const NOTE_OPENERS = [
  (p: string, h: string) => `First recorded in ${p}, never earlier than ${h}.`,
  (p: string, h: string) => `Sightings cluster in ${p} and stop dead by ${h}.`,
  (p: string, h: string) => `Known to ${p} for a long time; reported only at ${h}.`,
  (p: string, h: string) => `Endemic to ${p}. Stirs at ${h}, not a minute before.`,
];

const NOTE_DIET = [
  (a: string) => `Feeds, exclusively and without apology, on ${a}.`,
  (a: string) => `Its entire diet is ${a}.`,
  (a: string) => `Leave out ${a} and it will trouble nothing else.`,
  (a: string) => `Will cross a whole town for ${a}.`,
];

const NOTE_CLOSE = [
  "Harmless if acknowledged. Insufferable if ignored.",
  "Cannot be trapped, only negotiated with.",
  "Answers to no name, but comes when yours is called.",
  "Leaves the house tidier than it found it. Occasionally.",
  "Considered a good omen by everyone who has stopped running.",
  "Has never once been photographed in focus.",
];

/* ------------------------------------------------------------------ */

function hourLabel(h: number): string {
  const suffix = h < 12 ? "AM" : "PM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:00 ${suffix}`;
}

function activeWindow(h: number, rng: Rng): string {
  const span = rng.int(40, 110);
  const start = h * 60 + rng.int(0, 25);
  const end = (start + span) % 1440;
  const f = (m: number) =>
    `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  return `${f(start)} – ${f(end)}`;
}

function latinize(name: string, rng: Rng): string {
  const first = name.split(/\s+/)[0] ?? name;
  let stem = first.toLowerCase().replace(/[^a-z]/g, "");
  if (!stem) stem = "ignotus";
  if (stem.length > 9) stem = stem.slice(0, 9);
  const trimmed = stem.replace(/[aeiou]+$/, "");
  if (trimmed.length >= 3) stem = trimmed;
  return stem + rng.pick(EPITHET_SUFFIX);
}

function shortAppetite(a: string): string {
  const words = a.split(/\s+/).filter((w) => !/^(the|a|an|of|at|in|on|to|for)$/i.test(w));
  const core = words.slice(-2).join(" ") || a;
  return core.length > 20 ? words[words.length - 1] : core;
}

function titleCase(s: string): string {
  return s.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

/* ------------------------------------------------------------------ */

export function generateCryptid(spec: CryptidSpec): Cryptid {
  const seed = specSeed(spec);
  const rng = new Rng(seed);
  const h = hashString(seed);

  // Archetype is biased by temperament so the drawing matches the vibe, but
  // still varies between people who pick the same option.
  const bias: Record<TemperamentId, Archetype[]> = {
    skittish: ["crawler", "lanky", "wisp"],
    vengeful: ["coiled", "hulk", "lanky"],
    melancholic: ["wisp", "lanky", "plumed"],
    mischievous: ["crawler", "plumed", "lanky"],
    devoted: ["hulk", "plumed", "wisp"],
    feral: ["hulk", "coiled", "crawler"],
  };
  const pool = bias[spec.temperament];
  const archetype: Archetype = rng.weighted([
    [pool[0], 4],
    [pool[1], 3],
    [pool[2], 2],
    [rng.pick(["lanky", "hulk", "crawler", "wisp", "coiled", "plumed"] as const), 2],
  ]);

  const genome: Genome = {
    archetype,
    eyes: rng.weighted([
      [1, 2], [2, 6], [3, 3], [4, 3], [5, 1], [6, 2],
    ]),
    eyeStyle: rng.pick(["pupil", "slit", "void", "ring"] as const),
    horns: rng.weighted([
      ["none", 3], ["spikes", 3], ["antlers", 3],
      ["curl", 3], ["crown", 2], ["single", 2],
    ] as const),
    mouth: rng.pick(["grin", "line", "gape", "tiny"] as const),
    tail: archetype === "wisp"
      ? "none"
      : rng.weighted([["none", 2], ["whip", 3], ["tuft", 3], ["spade", 2], ["fork", 2]] as const),
    wings: rng.weighted([
      ["none", 6], ["bat", 3], ["moth", 3], ["stub", 2],
    ] as const),
    markings: rng.weighted([
      ["none", 2], ["spots", 3], ["stripes", 3], ["bands", 2], ["stars", 2],
    ] as const),
    frills: rng.bool(0.35),
    palette: PALETTES[h % PALETTES.length],
    wobble: Array.from({ length: 14 }, () => rng.range(-0.13, 0.13)),
    limbWobble: Array.from({ length: 12 }, () => rng.range(-0.25, 0.25)),
    lean: rng.range(-0.09, 0.09),
    stoop: rng.range(0, 1),
    scale: rng.range(0.95, 1.06),
  };

  const temperament = TEMPERAMENTS.find((t) => t.id === spec.temperament)!;
  const adj = rng.pick(ADJECTIVES[spec.temperament]);
  const noun = rng.pick(ARCH_NOUNS[archetype]);
  const commonName = `The ${adj} ${noun}`;
  const binomial = `${rng.pick(GENERA[archetype])} ${latinize(spec.keeper, rng)}`;
  const role = ROLES[hashString(spec.appetite.toLowerCase()) % ROLES.length];
  const alias = `${role} of ${titleCase(shortAppetite(spec.appetite))}`;

  const hLabel = hourLabel(spec.hour);
  const notes = [
    rng.pick(NOTE_OPENERS)(spec.place, hLabel),
    rng.pick(NOTE_DIET)(spec.appetite),
    rng.pick(NOTE_CLOSE),
  ].join(" ");

  const danger = 1 + (hashString(seed + "danger") % 5);
  const heightM = +rng.range(
    archetype === "crawler" ? 0.3 : archetype === "hulk" ? 1.9 : 0.9,
    archetype === "crawler" ? 1.1 : archetype === "hulk" ? 3.4 : 2.3
  ).toFixed(1);
  const massKg = Math.round(heightM * rng.range(9, 46));
  const year = 1874 + (hashString(seed + "y") % 148);
  const month = 1 + (hashString(seed + "m") % 12);
  const day = 1 + (hashString(seed + "d") % 28);
  const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

  const stats: { label: string; value: string }[] = [
    { label: "HABITAT", value: spec.place },
    { label: "ACTIVE", value: activeWindow(spec.hour, rng) },
    { label: "DIET", value: spec.appetite },
    { label: "TEMPERAMENT", value: temperament.label },
    { label: "HEIGHT", value: `${heightM.toFixed(1)} m` },
    { label: "MASS", value: `${massKg} kg (est.)` },
  ];

  return {
    spec,
    genome,
    commonName,
    binomial,
    alias,
    notes,
    stats,
    danger,
    heightM,
    plateNo: String((h % 480) + 1).padStart(3, "0"),
    specimenId: `CR-${h.toString(16).toUpperCase().slice(0, 4)}-${(h % 97)
      .toString()
      .padStart(2, "0")}`,
    firstSighted: `${String(day).padStart(2, "0")} ${MONTHS[month - 1]} ${year}`,
    activeWindow: hLabel,
    temperamentLabel: temperament.label,
  };
}
