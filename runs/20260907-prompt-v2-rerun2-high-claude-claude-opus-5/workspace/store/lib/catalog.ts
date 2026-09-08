import saints from "@/data/saints.json";

/** Prodigi product we print on. Unisex Softstyle — ships to ~100 countries. */
export const SKU = "GLOBAL-TEE-GIL-64000";

export type Tone = "dark" | "light";

export type Garment = {
  /** Prodigi colour attribute — must match the SKU's catalogue values exactly. */
  id: string;
  label: string;
  hex: string;
  tone: Tone;
};

/**
 * Colours are limited to variants Prodigi can fulfil worldwide in every size we
 * sell — see data/availability.json, refreshed by design/fetch-availability.mjs.
 */
export const GARMENTS: Garment[] = [
  { id: "black", label: "Black", hex: "#17181a", tone: "dark" },
  { id: "navy blue", label: "Navy", hex: "#1e2a44", tone: "dark" },
  { id: "charcoal", label: "Charcoal", hex: "#3b3d40", tone: "dark" },
  { id: "military green", label: "Olive", hex: "#4a4a33", tone: "dark" },
  { id: "dark chocolate", label: "Chocolate", hex: "#3a2b23", tone: "dark" },
  { id: "cherry red", label: "Cherry", hex: "#8a1f2b", tone: "dark" },
  { id: "white", label: "White", hex: "#f6f4ef", tone: "light" },
  { id: "sand", label: "Sand", hex: "#ded3bd", tone: "light" },
];

export const SIZES = ["s", "m", "l", "xl", "2xl"] as const;
export type Size = (typeof SIZES)[number];

export const SIZE_LABEL: Record<string, string> = {
  s: "S", m: "M", l: "L", xl: "XL", "2xl": "2XL",
};

/** Retail price in minor units (USD cents). Prodigi's item cost is ~$12.19. */
export const PRICE_CENTS = 3400;
export const CURRENCY = "USD";

export type Saint = {
  slug: string;
  name: string;
  plateName: string;
  epithet: string;
  relic: string;
  invocation: string[];
  blurb: string;
  feastDay: string;
  order: number;
};

export const SAINTS = (saints as Saint[]).slice().sort((a, b) => a.order - b.order);

export function getSaint(slug: string): Saint | undefined {
  return SAINTS.find((s) => s.slug === slug);
}

export function garment(id: string): Garment | undefined {
  return GARMENTS.find((g) => g.id === id);
}

export const mockupSrc = (slug: string, color: string) =>
  `/mock/${slug}--${color.replace(/ /g, "-")}.jpg`;

export const artSrc = (slug: string, tone: Tone) => `/art/${slug}-${tone}.png`;

/** Absolute, publicly-fetchable URL of the print-ready file Prodigi will download. */
export const printUrl = (origin: string, slug: string, tone: Tone) =>
  `${origin}/print/${slug}-${tone}.png`;

export const money = (cents: number, currency = CURRENCY) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
