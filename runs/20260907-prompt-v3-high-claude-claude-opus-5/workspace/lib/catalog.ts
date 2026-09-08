/** Garment catalogue. Everything here is checked against the live Prodigi
 *  product feed for GLOBAL-TEE-BC-3001 (Bella + Canvas 3001, DTG).
 *  Colours are limited to variants that Prodigi can ship to all of
 *  SHIPPING_COUNTRIES in every size we sell. */

export const PRODIGI_SKU = "GLOBAL-TEE-BC-3001";
export const PRODIGI_SHIPPING_METHOD = "Budget";

/** Prodigi's declared front print area for this SKU, in pixels. */
export const PRINT_AREA = { width: 4680, height: 5790 } as const;

export type Ink = "bone" | "coal";

export type GarmentColor = {
  /** Prodigi variant attribute — must match their feed exactly. */
  id: string;
  label: string;
  /** Approximate garment colour, for the on-site mockup. */
  hex: string;
  /** Which way the artwork inks up so it stays legible on the fabric. */
  ink: Ink;
};

export const COLORS: GarmentColor[] = [
  { id: "black", label: "Black", hex: "#1a1a1c", ink: "bone" },
  { id: "asphalt", label: "Asphalt", hex: "#4a4e53", ink: "bone" },
  { id: "navy blue", label: "Navy", hex: "#26314a", ink: "bone" },
  { id: "army", label: "Army", hex: "#565a47", ink: "bone" },
  { id: "brown", label: "Cocoa", hex: "#4b3b33", ink: "bone" },
  { id: "maroon", label: "Maroon", hex: "#5b2b36", ink: "bone" },
  { id: "cream", label: "Cream", hex: "#eae1cd", ink: "coal" },
  { id: "white", label: "White", hex: "#f7f6f3", ink: "coal" },
];

export type GarmentSize = { id: string; label: string; surchargeCents: number };

export const SIZES: GarmentSize[] = [
  { id: "s", label: "S", surchargeCents: 0 },
  { id: "m", label: "M", surchargeCents: 0 },
  { id: "l", label: "L", surchargeCents: 0 },
  { id: "xl", label: "XL", surchargeCents: 0 },
  { id: "2xl", label: "2XL", surchargeCents: 300 },
  { id: "3xl", label: "3XL", surchargeCents: 500 },
];

export const CURRENCY = "usd";
/** Shipping is included in the price — Prodigi Budget runs ~$4.74. */
export const BASE_PRICE_CENTS = 4800;

export function colorById(id: string): GarmentColor | undefined {
  return COLORS.find((c) => c.id === id);
}

export function sizeById(id: string): GarmentSize | undefined {
  return SIZES.find((s) => s.id === id);
}

export function priceCents(sizeId: string): number {
  return BASE_PRICE_CENTS + (sizeById(sizeId)?.surchargeCents ?? 0);
}

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Countries where every colour/size combination we sell is fulfillable. */
/** Countries where every colour/size we sell is fulfillable by Prodigi
 *  and that Stripe Checkout accepts for address collection. */
export const SHIPPING_COUNTRIES = ["AE","AL","AM","AR","AT","AU","AZ","BA","BB","BD","BE","BG","BH","BM","BO","BR","BS","CA","CH","CI","CL","CN","CO","CR","CY","CZ","DE","DK","DO","EC","EE","EG","ES","FI","FR","GB","GE","GG","GH","GI","GR","HK","HN","HR","HU","ID","IE","IL","IM","IN","IS","IT","JE","JM","JO","JP","KE","KG","KH","KR","KW","KZ","LK","LT","LU","LV","MA","MC","ME","MK","MQ","MT","MX","MY","NA","NG","NL","NO","NZ","OM","PE","PH","PK","PL","PR","PT","PY","QA","RE","RO","RS","SA","SC","SE","SG","SI","SK","SV","TH","TJ","TR","TT","TW","TZ","UA","US","UY","ZA"] as const;

export type GarmentChoice = { color: string; size: string };

export function normalizeGarment(input: Partial<GarmentChoice>): GarmentChoice {
  return {
    color: colorById(String(input.color)) ? String(input.color) : "black",
    size: sizeById(String(input.size)) ? String(input.size) : "l",
  };
}
