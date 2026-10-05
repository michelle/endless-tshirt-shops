/** Product catalogue: the single place that knows about Prodigi SKUs and prices. */

export const PRODIGI_SKU = "GLOBAL-TEE-GIL-64000";
export const PRINT_AREA = "front";
/** Front print-area resolution reported by Prodigi for this SKU. */
export const PRINT_AREA_PX = { width: 4665, height: 5844 };

export const CURRENCY = "usd";
export const BASE_PRICE_CENTS = 3600;
export const SHIPPING_CENTS = 600;
const LARGE_SIZE_SURCHARGE_CENTS = 400;

export const SIZES = ["xs", "s", "m", "l", "xl", "2xl", "3xl", "4xl", "5xl"] as const;
export type Size = (typeof SIZES)[number];

export function isSize(value: unknown): value is Size {
  return typeof value === "string" && (SIZES as readonly string[]).includes(value);
}

export function priceCents(size: Size): number {
  return BASE_PRICE_CENTS + (["2xl", "3xl", "4xl", "5xl"].includes(size) ? LARGE_SIZE_SURCHARGE_CENTS : 0);
}

export interface ShirtColor {
  id: string;
  label: string;
  hex: string;
  /** Ink palettes that read well on this garment. */
  recommended: string[];
}

export const SHIRT_COLORS: ShirtColor[] = [
  { id: "black", label: "Black", hex: "#161616", recommended: ["starlight", "ivory"] },
  { id: "charcoal", label: "Charcoal", hex: "#3b3b3d", recommended: ["starlight", "ivory"] },
  { id: "dark heather grey", label: "Dark Heather", hex: "#4a4a4c", recommended: ["starlight", "ivory"] },
  { id: "navy blue", label: "Navy", hex: "#22304f", recommended: ["starlight", "ivory"] },
  { id: "forest green", label: "Forest", hex: "#24402c", recommended: ["starlight", "ivory"] },
  { id: "maroon", label: "Maroon", hex: "#5b2028", recommended: ["starlight", "ivory"] },
  { id: "purple", label: "Purple", hex: "#4b2e5e", recommended: ["starlight", "ivory"] },
  { id: "royal blue", label: "Royal", hex: "#2a4a9b", recommended: ["starlight", "ivory"] },
  { id: "red", label: "Red", hex: "#b3202b", recommended: ["starlight", "ivory"] },
  { id: "military green", label: "Military Green", hex: "#4a4f3a", recommended: ["starlight", "ivory"] },
  { id: "white", label: "White", hex: "#f5f5f3", recommended: ["midnight", "ember"] },
  { id: "sport grey", label: "Sport Grey", hex: "#a7a9ac", recommended: ["midnight", "ember"] },
  { id: "ice grey", label: "Ice Grey", hex: "#d5d9dd", recommended: ["midnight", "ember"] },
  { id: "sand", label: "Sand", hex: "#d8c6a5", recommended: ["midnight", "ember"] },
  { id: "natural", label: "Natural", hex: "#efe7d6", recommended: ["midnight", "ember"] },
];

export const COLOR_BY_ID = new Map(SHIRT_COLORS.map((c) => [c.id, c]));

export interface InkPalette {
  id: string;
  label: string;
  description: string;
  primary: string;
  accent: string;
  faint: string;
  /** Optional soft glow behind bright stars. */
  glow: string;
}

export const PALETTES: InkPalette[] = [
  {
    id: "starlight",
    label: "Starlight",
    description: "Warm cream and antique gold",
    primary: "#F4ECD8",
    accent: "#C9A24B",
    faint: "#8E97BE",
    glow: "#F4ECD8",
  },
  {
    id: "ivory",
    label: "Ivory",
    description: "Bright white with champagne",
    primary: "#FFFFFF",
    accent: "#E9D6A8",
    faint: "#AEB6D0",
    glow: "#FFFFFF",
  },
  {
    id: "midnight",
    label: "Midnight",
    description: "Deep navy and slate",
    primary: "#111A38",
    accent: "#2F4C86",
    faint: "#7280A6",
    glow: "#111A38",
  },
  {
    id: "ember",
    label: "Ember",
    description: "Espresso and burnt orange",
    primary: "#2A160F",
    accent: "#B4531F",
    faint: "#B98A6C",
    glow: "#2A160F",
  },
];

export const PALETTE_BY_ID = new Map(PALETTES.map((p) => [p.id, p]));

export function isPalette(value: unknown): value is string {
  return typeof value === "string" && PALETTE_BY_ID.has(value);
}

/** Countries Stripe Checkout and Prodigi both support for this SKU. */
export const SHIP_COUNTRIES = [
  "US", "CA", "GB", "IE", "AU", "NZ", "DE", "FR", "NL", "BE", "LU", "ES", "PT",
  "IT", "AT", "CH", "SE", "NO", "DK", "FI", "PL", "CZ", "SK", "HU", "RO", "GR",
  "HR", "SI", "EE", "LV", "LT", "JP", "KR", "SG", "HK", "TW", "MY", "PH", "MX",
  "BR", "CL", "CO", "ZA", "AE", "IL", "TR", "IN", "ID", "TH", "VN",
] as const;

export function formatMoney(cents: number, currency = CURRENCY): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}
