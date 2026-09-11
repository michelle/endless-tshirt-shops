/**
 * The design spec is the single source of truth for a customer's shirt. It is
 * what the preview renders, what the print file is generated from, and what
 * travels through checkout.
 */

export type Station = {
  label: string;
  note?: string;
  /** drawn as a big interchange ring rather than a tick */
  major?: boolean;
};

export type RouteLine = {
  name: string;
  color: string;
  stations: Station[];
};

export type LayoutVariant = 0 | 1 | 2 | 3;

export const SHIRT_SIZES = ["xs", "s", "m", "l", "xl", "2xl", "3xl"] as const;
export type ShirtSize = (typeof SHIRT_SIZES)[number];

export const SIZE_LABELS: Record<ShirtSize, string> = {
  xs: "XS", s: "S", m: "M", l: "L", xl: "XL", "2xl": "2XL", "3xl": "3XL",
};

export type GarmentColor =
  | "black" | "navy blue" | "white" | "sport grey" | "natural" | "maroon" | "forest green";

export type Spec = {
  v: 1;
  title: string;
  subtitle: string;
  motto: string;
  lines: RouteLine[];
  garment: GarmentColor;
  size: ShirtSize;
  variant: LayoutVariant;
  backPrint: boolean;
};

/** Prodigi colour name -> swatch + whether artwork should print in light ink. */
export const GARMENTS: Record<GarmentColor, { label: string; hex: string; dark: boolean }> = {
  black:          { label: "Black",      hex: "#16171b", dark: true },
  "navy blue":    { label: "Navy",       hex: "#20293f", dark: true },
  "forest green": { label: "Forest",     hex: "#20372a", dark: true },
  maroon:         { label: "Maroon",     hex: "#4a2029", dark: true },
  white:          { label: "White",      hex: "#f6f5f1", dark: false },
  natural:        { label: "Natural",    hex: "#e8dfcb", dark: false },
  "sport grey":   { label: "Sport Grey", hex: "#c9cac4", dark: false },
};

export const GARMENT_ORDER: GarmentColor[] = [
  "black", "navy blue", "forest green", "maroon", "white", "natural", "sport grey",
];

/** Line colours, tuned to stay legible on both dark and light garments. */
export const PALETTE: { id: string; name: string; hex: string }[] = [
  { id: "signal",   name: "Signal Red", hex: "#E8453C" },
  { id: "marigold", name: "Marigold",   hex: "#F2A93B" },
  { id: "acid",     name: "Acid",       hex: "#C9D93F" },
  { id: "jade",     name: "Jade",       hex: "#37B98A" },
  { id: "cyan",     name: "Cyan",       hex: "#38B6E0" },
  { id: "cobalt",   name: "Cobalt",     hex: "#4A6BE8" },
  { id: "violet",   name: "Violet",     hex: "#9B6BE8" },
  { id: "magenta",  name: "Magenta",    hex: "#E3559B" },
  { id: "coral",    name: "Coral",      hex: "#FF8A6B" },
  { id: "mint",     name: "Mint",       hex: "#7FE0C4" },
];

export const MAX_LINES = 4;
export const MAX_STATIONS = 9;
export const MIN_STATIONS = 2;

export const LIMITS = {
  title: 26,
  subtitle: 34,
  motto: 40,
  lineName: 20,
  station: 24,
  note: 12,
};

export function defaultSpec(): Spec {
  return {
    v: 1,
    title: "THE ROSA NETWORK",
    subtitle: "SERVICE MAP 1991 - PRESENT",
    motto: "MIND THE GAP",
    garment: "black",
    size: "l",
    variant: 0,
    backPrint: false,
    lines: [
      {
        name: "Growing Up Line",
        color: "#E8453C",
        stations: [
          { label: "Lisbon", note: "1991" },
          { label: "Grandma's Kitchen" },
          { label: "Public Library", note: "1999" },
          { label: "First Guitar", note: "2004", major: true },
          { label: "Leaving Home", note: "2009" },
        ],
      },
      {
        name: "Work Line",
        color: "#38B6E0",
        stations: [
          { label: "Night Shifts", note: "2010" },
          { label: "First Guitar", major: true },
          { label: "The Big Move", note: "2014" },
          { label: "Started The Studio", note: "2019" },
          { label: "Still Building", note: "now" },
        ],
      },
      {
        name: "Love Line",
        color: "#F2A93B",
        stations: [
          { label: "A Bad Idea", note: "2012" },
          { label: "The Big Move", major: true },
          { label: "Sam", note: "2016" },
          { label: "Two Cats", note: "2021" },
        ],
      },
    ],
  };
}

const CONTROL = new RegExp("[\\u0000-\\u001F\\u007F]", "g");

const clampStr = (s: unknown, max: number, fallback = ""): string => {
  if (typeof s !== "string") return fallback;
  return s.replace(CONTROL, "").trim().slice(0, max);
};

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Normalise arbitrary input (URL, request body, storage) into a safe Spec. */
export function sanitizeSpec(input: any): Spec {
  const d = defaultSpec();
  if (!input || typeof input !== "object") input = {};

  const rawLines = Array.isArray(input.lines) ? input.lines.slice(0, MAX_LINES) : [];
  const lines: RouteLine[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    const rl = rawLines[i];
    if (!rl || typeof rl !== "object") continue;
    const rawStations = Array.isArray(rl.stations) ? rl.stations.slice(0, MAX_STATIONS) : [];
    const stations: Station[] = [];
    for (const rs of rawStations) {
      if (!rs || typeof rs !== "object") continue;
      const label = clampStr(rs.label, LIMITS.station);
      if (!label) continue;
      stations.push({
        label,
        note: clampStr(rs.note, LIMITS.note) || undefined,
        major: !!rs.major,
      });
    }
    if (stations.length < MIN_STATIONS) continue;
    lines.push({
      name: clampStr(rl.name, LIMITS.lineName) || `Line ${i + 1}`,
      color: HEX.test(rl.color) ? rl.color : PALETTE[i % PALETTE.length].hex,
      stations,
    });
  }

  const garment: GarmentColor = GARMENT_ORDER.includes(input.garment) ? input.garment : d.garment;
  const size = ((SHIRT_SIZES as readonly string[]).includes(input.size) ? input.size : d.size) as ShirtSize;
  const variant = ([0, 1, 2, 3].includes(input.variant) ? input.variant : 0) as LayoutVariant;

  return {
    v: 1,
    title: clampStr(input.title, LIMITS.title) || "UNTITLED NETWORK",
    subtitle: clampStr(input.subtitle, LIMITS.subtitle),
    motto: clampStr(input.motto, LIMITS.motto),
    garment,
    size,
    variant,
    backPrint: !!input.backPrint,
    // Deliberately not falling back to the sample design: an empty result has
    // to stay empty so specProblem() can reject it instead of silently selling
    // somebody else's map.
    lines,
  };
}

export function specProblem(s: Spec): string | null {
  if (!s.title.trim()) return "Give your map a title.";
  if (!s.lines.length) return "Add at least one line.";
  for (const l of s.lines) {
    if (l.stations.length < MIN_STATIONS) return `"${l.name}" needs at least ${MIN_STATIONS} stops.`;
  }
  return null;
}

/** Stable 32-bit hash, used for the deterministic layout seed + serial number. */
export function specHash(s: Spec): number {
  const src = JSON.stringify([
    s.title, s.subtitle, s.motto, s.variant,
    s.lines.map((l) => [l.name, l.color, l.stations.map((st) => [st.label, st.note ?? "", !!st.major])]),
  ]);
  let h = 0x811c9dc5;
  for (let i = 0; i < src.length; i++) {
    h ^= src.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function serialOf(s: Spec): string {
  return (specHash(s).toString(36).toUpperCase() + "000000").slice(0, 6);
}
