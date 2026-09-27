/**
 * The store's product: one tee, printed on demand.
 * Prodigi product: Bella+Canvas 3001 unisex tee (DTG), global SKU
 * GLOBAL-TEE-BC-3001, fulfilled from the US, UK, EU and AU labs.
 * Front print area for the global variants is 4677x5881 px at 300dpi.
 */

export const PRODIGI_SKU = "GLOBAL-TEE-BC-3001";
export const PRINT_WIDTH = 4677;
export const PRINT_HEIGHT = 5881;

/** Garments offered by the store, mapped to Prodigi color attribute values. */
export interface GarmentOption {
  id: "black" | "navy" | "cream";
  name: string;
  /** Prodigi variant attribute value. */
  prodigiColor: string;
  /** CSS color used for the on-page mock garment. */
  fabricCss: string;
  blurb: string;
}

export const GARMENTS: GarmentOption[] = [
  {
    id: "black",
    name: "Midnight Black",
    prodigiColor: "black",
    fabricCss: "#1c1d22",
    blurb: "100% combed cotton, deep black.",
  },
  {
    id: "navy",
    name: "Deep Navy",
    prodigiColor: "navy blue",
    fabricCss: "#232f45",
    blurb: "100% combed cotton, night-sky navy.",
  },
  {
    id: "cream",
    name: "Soft Cream",
    prodigiColor: "cream",
    fabricCss: "#efe7d6",
    blurb: "100% combed cotton, warm cream.",
  },
];

/** Inks for the print, chosen per garment so DTG only lays down what it needs. */
export interface Palette {
  /** Base of the lit lunar surface. */
  moonBase: string;
  /** Deep tones for maria and crater floors. */
  moonDeep: string;
  /** Highlight tones for crater rims. */
  moonHigh: string;
  /** Hairline for the terminator and the orbit ring. */
  gold: string;
  /** Primary text ink. */
  ink: string;
  /** Secondary text ink (fades toward the garment). */
  inkSoft: string;
  /** Starfield ink. */
  star: string;
  /** Starfield accent. */
  starGold: string;
}

export const PALETTES: Record<string, Palette> = {
  black: {
    moonBase: "#f4ead4",
    moonDeep: "#d9cba8",
    moonHigh: "#fdf6e4",
    gold: "#c9a25c",
    ink: "#f2e9d6",
    inkSoft: "#c9bfa6",
    star: "#e9dfc6",
    starGold: "#c9a25c",
  },
  navy: {
    moonBase: "#f4ead4",
    moonDeep: "#d9cba8",
    moonHigh: "#fdf6e4",
    gold: "#c9a25c",
    ink: "#f0e8d8",
    inkSoft: "#bcc4c9",
    star: "#e9dfc6",
    starGold: "#c9a25c",
  },
  cream: {
    moonBase: "#28304d",
    moonDeep: "#1a2038",
    moonHigh: "#3c4668",
    gold: "#a6802f",
    ink: "#232c49",
    inkSoft: "#6a7392",
    star: "#2c3554",
    starGold: "#a6802f",
  },
};

/** Size options with their Prodigi attribute values. */
export const SIZES = ["s", "m", "l", "xl", "2xl", "3xl"] as const;
export type Size = (typeof SIZES)[number];

export const SIZE_LABELS: Record<Size, string> = {
  s: "S", m: "M", l: "L", xl: "XL", "2xl": "2XL", "3xl": "3XL",
};

/** Retail price in cents. Free worldwide shipping is included. */
export function unitPriceCents(size: Size): number {
  return size === "2xl" || size === "3xl" ? 3900 : 3600;
}

export const CURRENCY = "usd";

/** Countries we let Stripe collect a shipping address for. */
export const SHIP_TO_COUNTRIES = [
  "US", "CA", "GB", "IE", "FR", "DE", "AT", "BE", "CH", "DK", "ES", "FI",
  "IT", "NL", "NO", "PT", "SE", "LU", "AU", "NZ", "JP", "SG", "HK", "KR",
];
