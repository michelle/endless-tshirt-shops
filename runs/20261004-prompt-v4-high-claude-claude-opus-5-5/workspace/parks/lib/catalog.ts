// Product catalogue. Colours/sizes are Prodigi GLOBAL-TEE-BC-3001 (Bella+Canvas 3001)
// variants that ship from US/UK/EU/AU labs to every country listed below.

export const SKU = "GLOBAL-TEE-BC-3001";
export const PRICE_CENTS = 3400; // includes standard shipping
export const CURRENCY = "usd";

export const SHIRT_COLORS = [
  { id: "black", label: "Black", hex: "#1c1c1e" },
  { id: "navy blue", label: "Navy", hex: "#232b45" },
  { id: "asphalt", label: "Asphalt", hex: "#4b4c51" },
  { id: "army", label: "Army", hex: "#5d5b43" },
  { id: "maroon", label: "Maroon", hex: "#5b2030" },
  { id: "athletic grey heather", label: "Heather grey", hex: "#a9aaae" },
  { id: "cream", label: "Cream", hex: "#efe5cf" },
  { id: "white", label: "White", hex: "#f6f6f4" },
] as const;

export const SIZES = ["s", "m", "l", "xl", "2xl", "3xl"] as const;

export const SHIP_COUNTRIES = [
  "US", "CA", "GB", "IE", "AU", "NZ", "DE", "FR", "NL", "BE", "LU", "AT", "CH", "ES", "PT",
  "IT", "SE", "DK", "FI", "NO", "PL", "CZ", "JP", "SG",
] as const;

export type ShirtColor = (typeof SHIRT_COLORS)[number]["id"];
export type Size = (typeof SIZES)[number];

export const isColor = (c: unknown): c is ShirtColor => SHIRT_COLORS.some((s) => s.id === c);
export const isSize = (s: unknown): s is Size => (SIZES as readonly string[]).includes(s as string);
export const colorLabel = (c: string) => SHIRT_COLORS.find((s) => s.id === c)?.label ?? c;
