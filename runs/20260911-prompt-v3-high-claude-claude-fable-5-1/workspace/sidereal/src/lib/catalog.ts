// Product catalog: one garment (Bella + Canvas 3001, printed DTG by Prodigi),
// a curated set of colours, and sizes. Prices are in USD cents.

export const PRODIGI_SKU = "GLOBAL-TEE-BC-3001";

export type GarmentKey =
  | "black"
  | "navy"
  | "asphalt"
  | "military"
  | "maroon"
  | "white"
  | "natural"
  | "heather";

export interface Garment {
  key: GarmentKey;
  label: string;
  /** Prodigi `color` attribute value for GLOBAL-TEE-BC-3001 */
  prodigiColor: string;
  /** Approximate garment hex for on-screen mockups */
  hex: string;
  /** Whether the garment is dark (white ink) or light (dark ink) */
  dark: boolean;
}

export const GARMENTS: Garment[] = [
  { key: "black", label: "Black", prodigiColor: "black", hex: "#141416", dark: true },
  { key: "navy", label: "Navy", prodigiColor: "navy blue", hex: "#1c2540", dark: true },
  { key: "asphalt", label: "Asphalt", prodigiColor: "asphalt", hex: "#4a4d53", dark: true },
  { key: "military", label: "Military green", prodigiColor: "military green", hex: "#4b5544", dark: true },
  { key: "maroon", label: "Maroon", prodigiColor: "maroon", hex: "#5c2431", dark: true },
  { key: "white", label: "White", prodigiColor: "white", hex: "#f4f3ef", dark: false },
  { key: "natural", label: "Natural", prodigiColor: "natural", hex: "#e9e2d0", dark: false },
  { key: "heather", label: "Athletic heather", prodigiColor: "athletic grey heather", hex: "#b9bbbd", dark: false },
];

export const GARMENT_KEYS = GARMENTS.map((g) => g.key) as [GarmentKey, ...GarmentKey[]];

export function getGarment(key: string): Garment {
  return GARMENTS.find((g) => g.key === key) ?? GARMENTS[0];
}

export const SIZES = ["xs", "s", "m", "l", "xl", "2xl", "3xl"] as const;
export type Size = (typeof SIZES)[number];

export const PRICE_CENTS = 3800; // per shirt
export const CURRENCY = "usd";

export const SHIPPING_OPTIONS = [
  { key: "standard", label: "Standard shipping", cents: 595, minDays: 5, maxDays: 10 },
  { key: "express", label: "Express shipping", cents: 1495, minDays: 2, maxDays: 5 },
] as const;

// Countries we accept at checkout. All are in Prodigi's ship-to list for this SKU.
export const SHIP_COUNTRIES = [
  "US", "CA", "GB", "IE", "AU", "NZ", "DE", "FR", "ES", "IT", "NL", "BE", "AT", "CH",
  "SE", "NO", "DK", "FI", "PT", "PL", "CZ", "GR", "HU", "RO", "SK", "SI", "HR",
  "EE", "LV", "LT", "LU", "IS", "MT", "CY", "JP", "KR", "SG", "HK", "MX", "BR",
] as const;
