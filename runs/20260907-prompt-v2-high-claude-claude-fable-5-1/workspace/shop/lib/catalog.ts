import designs from "./designs.json";

export type Ink = "light" | "dark";

export type ShirtColor = {
  id: string; // Prodigi attribute value
  label: string;
  hex: string;
  ink: Ink; // which print variant goes on this shirt
};

export const SKU = "GLOBAL-TEE-BC-3001"; // Bella + Canvas 3001 unisex tee
export const CURRENCY = "USD";
export const PRICE_CENTS = 3400; // retail price per shirt
export const BRAND = "The Obsolete Guild";

export const COLORS: ShirtColor[] = [
  { id: "black", label: "Black", hex: "#1a1a1a", ink: "light" },
  { id: "navy blue", label: "Navy", hex: "#1f2a44", ink: "light" },
  { id: "maroon", label: "Maroon", hex: "#5b1f2b", ink: "light" },
  { id: "military green", label: "Military green", hex: "#4b5540", ink: "light" },
  { id: "dark heather grey", label: "Dark heather", hex: "#4a4a4c", ink: "light" },
  { id: "natural", label: "Natural", hex: "#e9e2cf", ink: "dark" },
  { id: "white", label: "White", hex: "#f4f4f2", ink: "dark" },
  { id: "athletic grey heather", label: "Athletic heather", hex: "#b9b9b6", ink: "dark" },
];

export const SIZES = ["xs", "s", "m", "l", "xl", "2xl", "3xl", "4xl"] as const;
export type Size = (typeof SIZES)[number];

export type Design = (typeof designs)[number];

export const DESIGNS: Design[] = designs;

export function getDesign(slug: string): Design | undefined {
  return DESIGNS.find((d) => d.slug === slug);
}

export function getColor(id: string): ShirtColor | undefined {
  return COLORS.find((c) => c.id === id);
}

export function isSize(s: string): s is Size {
  return (SIZES as readonly string[]).includes(s);
}

export function previewUrl(slug: string, ink: Ink) {
  return `/designs/${slug}-${ink}.png`;
}

export function printUrl(slug: string, ink: Ink) {
  return `/designs/${slug}-${ink}-print.png`;
}

export function formatMoney(cents: number, currency = CURRENCY) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}
