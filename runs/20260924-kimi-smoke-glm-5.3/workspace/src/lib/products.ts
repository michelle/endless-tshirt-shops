/**
 * Product catalog: the Gildan 64000 Softstyle tee, DTG-printed by Prodigi.
 * Garment colors are curated so the chart ink always has contrast, and the
 * ink palette (light for dark garments, dark for light garments) is derived
 * automatically from the chosen color.
 */

export const PRODIGI_SKU = "GLOBAL-TEE-GIL-64000";

export const SIZES = ["xs", "s", "m", "l", "xl", "2xl", "3xl", "4xl", "5xl"] as const;
export type Size = (typeof SIZES)[number];

export const SIZE_LABELS: Record<Size, string> = {
  xs: "XS", s: "S", m: "M", l: "L", xl: "XL",
  "2xl": "2XL", "3xl": "3XL", "4xl": "4XL", "5xl": "5XL",
};

/** Sizes we actually offer in the storefront. */
export const OFFERED_SIZES: Size[] = ["s", "m", "l", "xl", "2xl", "3xl"];

export interface GarmentColor {
  /** Prodigi attribute value — must match the Product Details enum exactly. */
  id: string;
  label: string;
  /** CSS swatch for the store UI / tee mockup. */
  swatch: string;
  /** Dark garments get light ink; light garments get dark ink. */
  ink: "light" | "dark";
  /** Rough fabric tone for the mockup shading. */
  hi: string;
  lo: string;
}

export const COLORS: GarmentColor[] = [
  { id: "navy blue", label: "Deep Navy", swatch: "#1c2740", ink: "light", hi: "#2a3755", lo: "#141d30" },
  { id: "black", label: "Jet Black", swatch: "#17181b", ink: "light", hi: "#26272c", lo: "#0e0f11" },
  { id: "forest green", label: "Forest Green", swatch: "#1f3527", ink: "light", hi: "#2c4835", lo: "#152418" },
  { id: "maroon", label: "Maroon", swatch: "#4e1f26", ink: "light", hi: "#68303a", lo: "#38161c" },
  { id: "dark heather grey", label: "Dark Heather", swatch: "#3b3d41", ink: "light", hi: "#4c4e53", lo: "#2b2c2f" },
  { id: "white", label: "White", swatch: "#f4f2ec", ink: "dark", hi: "#fdfcf9", lo: "#e6e3da" },
  { id: "natural", label: "Natural", swatch: "#e6dcc2", ink: "dark", hi: "#f4ecd8", lo: "#d5c9a9" },
  { id: "sand", label: "Sand", swatch: "#d8c9a8", ink: "dark", hi: "#e6d9bb", lo: "#c4b28c" },
  { id: "sport grey", label: "Sport Grey", swatch: "#c9c9c9", ink: "dark", hi: "#d9d9d9", lo: "#b5b5b5" },
];

export const COLORS_BY_ID: Record<string, GarmentColor> = Object.fromEntries(
  COLORS.map(c => [c.id, c]),
);

/** Retail prices in USD cents, US shipping included. */
export function priceCents(size: Size): number {
  return size === "3xl" ? 4800 : 4200;
}

export function isOfferedSize(v: string): v is Size {
  return (OFFERED_SIZES as readonly string[]).includes(v);
}

export function isColorId(v: string): boolean {
  return v in COLORS_BY_ID;
}
