// Shared catalog data: palettes, shirt colors, sizes, pricing.
// This is the single source of truth used by the customizer UI, the
// checkout API, the art renderer, and the Prodigi fulfillment mapping.

export type PaletteId =
  | "signal"
  | "ember"
  | "static"
  | "tidal"
  | "citrus"
  | "mono";

export interface Palette {
  id: PaletteId;
  name: string;
  colors: string[]; // hex colors cycled around the pattern
}

export const PALETTES: Record<PaletteId, Palette> = {
  signal: { id: "signal", name: "Signal", colors: ["#5ee6d0", "#3fa9f5", "#7c5cff", "#ff5ca8"] },
  ember: { id: "ember", name: "Ember", colors: ["#ff7a3c", "#ff4d4d", "#ffb238", "#ff3c8e"] },
  static: { id: "static", name: "Static", colors: ["#eaeaea", "#9ea3ad", "#5b616e", "#2b2f38"] },
  tidal: { id: "tidal", name: "Tidal", colors: ["#0ea5b7", "#12d1c0", "#1c6dd0", "#8be8ff"] },
  citrus: { id: "citrus", name: "Citrus", colors: ["#c6ff3c", "#ffe23c", "#ff9f1c", "#6bd425"] },
  mono: { id: "mono", name: "Mono Ink", colors: ["#f4f4f2", "#c9c9c4", "#8d8d88", "#4a4a46"] },
};

export const PALETTE_IDS = Object.keys(PALETTES) as PaletteId[];

export type ShirtColorId = "white" | "black" | "navy" | "sport-grey";

export interface ShirtColor {
  id: ShirtColorId;
  name: string;
  hex: string; // swatch / mockup background
  dark: boolean; // whether ink should be light text on this garment
  prodigiValue: string; // Prodigi `color` attribute value for GLOBAL-TEE-GIL-64000
}

export const SHIRT_COLORS: Record<ShirtColorId, ShirtColor> = {
  white: { id: "white", name: "White", hex: "#f5f4f0", dark: false, prodigiValue: "white" },
  black: { id: "black", name: "Black", hex: "#1a1a1a", dark: true, prodigiValue: "black" },
  navy: { id: "navy", name: "Navy", hex: "#1f2a44", dark: true, prodigiValue: "navy blue" },
  "sport-grey": {
    id: "sport-grey",
    name: "Sport Grey",
    hex: "#9a9a9a",
    dark: false,
    prodigiValue: "sport grey",
  },
};

export const SHIRT_COLOR_IDS = Object.keys(SHIRT_COLORS) as ShirtColorId[];

export type SizeId = "s" | "m" | "l" | "xl" | "2xl";

export const SIZES: { id: SizeId; label: string; upchargeCents: number }[] = [
  { id: "s", label: "S", upchargeCents: 0 },
  { id: "m", label: "M", upchargeCents: 0 },
  { id: "l", label: "L", upchargeCents: 0 },
  { id: "xl", label: "XL", upchargeCents: 0 },
  { id: "2xl", label: "2XL", upchargeCents: 300 },
];

export const BASE_PRICE_CENTS = 3200;
export const PRODIGI_SKU = "GLOBAL-TEE-GIL-64000";
export const MAX_PHRASE_LENGTH = 28;
export const MAX_QTY_PER_ITEM = 10;
export const MAX_ITEMS_PER_ORDER = 12;

export interface DesignSpec {
  phrase: string;
  paletteId: PaletteId;
  shirtColorId: ShirtColorId;
}

export interface CartItem {
  id: string;
  spec: DesignSpec;
  size: SizeId;
  qty: number;
}

export function priceForSize(size: SizeId): number {
  const s = SIZES.find((x) => x.id === size);
  return BASE_PRICE_CENTS + (s?.upchargeCents ?? 0);
}

export function isPaletteId(v: unknown): v is PaletteId {
  return typeof v === "string" && (PALETTE_IDS as string[]).includes(v);
}

export function isShirtColorId(v: unknown): v is ShirtColorId {
  return typeof v === "string" && (SHIRT_COLOR_IDS as string[]).includes(v);
}

export function isSizeId(v: unknown): v is SizeId {
  return typeof v === "string" && SIZES.some((s) => s.id === v);
}

export function sanitizePhrase(raw: string): string {
  return raw
    .replace(/[^\x20-\x7E]/g, "")
    .trim()
    .slice(0, MAX_PHRASE_LENGTH);
}
