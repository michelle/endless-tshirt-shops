// Product catalogue: what we sell, at what price, mapped onto the Prodigi SKU.

export const PRODIGI_SKU = "GLOBAL-TEE-GIL-64000"; // Gildan 64000 Softstyle unisex tee, DTG front print
export const PRINT_WIDTH_PX = 4677;  // Prodigi front print area at 300 dpi (≈15.6 in)
export const PRINT_HEIGHT_PX = 5881; // ≈19.6 in

export const PRICE_CENTS = 3400; // USD, shipping included
export const CURRENCY = "usd";
export const MAX_QTY = 5;

export interface TeeColor {
  id: string;       // Prodigi attribute value
  label: string;
  hex: string;      // for mockups
  dark: boolean;    // dark garment → light ink
}

export const TEE_COLORS: TeeColor[] = [
  { id: "black", label: "Black", hex: "#141417", dark: true },
  { id: "navy blue", label: "Navy", hex: "#1c2742", dark: true },
  { id: "charcoal", label: "Charcoal", hex: "#3d3f45", dark: true },
  { id: "forest green", label: "Forest", hex: "#22422f", dark: true },
  { id: "maroon", label: "Maroon", hex: "#5c2030", dark: true },
  { id: "dark heather grey", label: "Dark heather", hex: "#4b4d52", dark: true },
  { id: "white", label: "White", hex: "#f4f4f2", dark: false },
  { id: "sand", label: "Sand", hex: "#d8ccb1", dark: false },
  { id: "sport grey", label: "Sport grey", hex: "#b8b9b7", dark: false },
  { id: "light blue", label: "Light blue", hex: "#a8c3df", dark: false },
];

export const SIZES = ["xs", "s", "m", "l", "xl", "2xl", "3xl"] as const;
export type Size = (typeof SIZES)[number];

export interface Accent {
  id: string;
  label: string;
  onDark: string;
  onLight: string;
}

export const ACCENTS: Accent[] = [
  { id: "sky", label: "Sky", onDark: "#79bcff", onLight: "#2a7fd4" },
  { id: "coral", label: "Coral", onDark: "#ff6f5e", onLight: "#e04a3a" },
  { id: "mint", label: "Mint", onDark: "#5fe3b3", onLight: "#1fa77c" },
  { id: "gold", label: "Gold", onDark: "#f3ba4c", onLight: "#d99a1e" },
  { id: "lilac", label: "Lilac", onDark: "#b892ff", onLight: "#7c4fd8" },
  { id: "ink", label: "Ink only", onDark: "#f5f2ea", onLight: "#17181c" },
];

export const LAYOUTS = ["full", "inner"] as const;
export type Layout = (typeof LAYOUTS)[number];

export function teeColor(id: string): TeeColor {
  return TEE_COLORS.find((c) => c.id === id) ?? TEE_COLORS[0];
}
export function accent(id: string): Accent {
  return ACCENTS.find((a) => a.id === id) ?? ACCENTS[0];
}
