// 4000 Fridays — store configuration.
// Single source of truth for product options, pricing and print geometry.

export const STORE_NAME = "4000 Fridays";
export const STORE_TAGLINE = "One dot for every week you've been alive.";

/** Prodigi sandbox/live API base. Override with PRODIGI_API_BASE in production. */
export const PRODIGI_API_BASE =
  process.env.PRODIGI_API_BASE || "https://api.sandbox.prodigi.com/v4.0";

/** The DTG product we fulfil with (verified against the sandbox product endpoint). */
export const PRODIGI_SKU = "GLOBAL-TEE-BC-3001"; // Bella+Canvas 3001, unisex tee
export const PRODIGI_SHIPPING_METHOD = "Standard";

// Price (retail), in cents.
export const SHIRT_PRICE_CENTS = 3200; // $32.00
export const SHIPPING_PRICE_CENTS = 699; // $6.99 flat
export const CURRENCY = "usd";

// Life-calendar grid geometry.
export const LIFESPAN_YEARS = 80;
export const WEEKS_PER_YEAR = 52;

// Print area: 15.6in x 19.3in front print at 300 DPI (Prodigi file requirement).
export const PRINT_WIDTH_PX = 4680;
export const PRINT_HEIGHT_PX = 5790;

// ---------------------------------------------------------------- shirts ----

export type ShirtId = "black" | "white" | "navy" | "red" | "natural";

export interface ShirtOption {
  id: ShirtId;
  label: string;
  /** Exact Prodigi attribute value. */
  prodigiColor: string;
  /** Garment colour used for on-screen previews. */
  previewHex: string;
  /** True when the garment is dark and needs light ink. */
  dark: boolean;
}

export const SHIRTS: ShirtOption[] = [
  { id: "black", label: "Black", prodigiColor: "black", previewHex: "#16171c", dark: true },
  { id: "white", label: "White", prodigiColor: "white", previewHex: "#f5f3ee", dark: false },
  { id: "navy", label: "Navy", prodigiColor: "navy blue", previewHex: "#1e2a49", dark: true },
  { id: "red", label: "Red", prodigiColor: "red", previewHex: "#a32b31", dark: true },
  { id: "natural", label: "Natural", prodigiColor: "natural", previewHex: "#e7dfcd", dark: false },
];

export function getShirt(id: string): ShirtOption | undefined {
  return SHIRTS.find((s) => s.id === id);
}

// ----------------------------------------------------------------- sizes ----

export type SizeId = "xs" | "s" | "m" | "l" | "xl" | "2xl" | "3xl" | "4xl";

export const SIZES: SizeId[] = ["xs", "s", "m", "l", "xl", "2xl", "3xl", "4xl"];

export const SIZE_LABELS: Record<SizeId, string> = {
  xs: "XS", s: "S", m: "M", l: "L", xl: "XL", "2xl": "2XL", "3xl": "3XL", "4xl": "4XL",
};

// --------------------------------------------------------------- accents ----

export type AccentId = "ember" | "cobalt" | "teal" | "magenta" | "gold" | "forest";

export interface AccentOption {
  id: AccentId;
  label: string;
  hex: string;
}

export const ACCENTS: AccentOption[] = [
  { id: "ember", label: "Ember", hex: "#d8552c" },
  { id: "cobalt", label: "Cobalt", hex: "#2e63d4" },
  { id: "teal", label: "Teal", hex: "#0f8f7c" },
  { id: "magenta", label: "Magenta", hex: "#c23b77" },
  { id: "gold", label: "Gold", hex: "#cf9a12" },
  { id: "forest", label: "Forest", hex: "#2e7d32" },
];

export function getAccent(id: string): AccentOption | undefined {
  return ACCENTS.find((a) => a.id === id);
}

// -------------------------------------------------------------- shipping ----

/**
 * Countries the GLOBAL-TEE-BC-3001 "global" variant ships to (from Prodigi),
 * intersected with the countries Stripe Checkout can collect addresses for
 * (Prodigi ships to 119; Stripe cannot collect for IR and VI, which are
 * therefore excluded).
 */
export const SHIP_COUNTRIES: string[] = [
  "AE", "AL", "AM", "AR", "AT", "AU", "AZ", "BA", "BB", "BD",
  "BE", "BG", "BH", "BM", "BN", "BO", "BR", "BS", "BY", "CA",
  "CH", "CI", "CL", "CN", "CO", "CR", "CY", "CZ", "DE", "DK",
  "DO", "EC", "EE", "EG", "ES", "FI", "FR", "GB", "GE", "GG",
  "GH", "GI", "GR", "HK", "HN", "HR", "HU", "ID", "IE", "IL",
  "IM", "IN", "IQ", "IS", "IT", "JE", "JM", "JO", "JP", "KE",
  "KG", "KH", "KR", "KW", "KZ", "LB", "LK", "LT", "LU", "LV",
  "LY", "MA", "MC", "ME", "MK", "MQ", "MT", "MX", "MY", "NA",
  "NG", "NL", "NO", "NZ", "OM", "PE", "PH", "PK", "PL", "PR",
  "PT", "PY", "QA", "RE", "RO", "RS", "RU", "SA", "SC", "SE",
  "SG", "SI", "SK", "SV", "TH", "TJ", "TR", "TT", "TW", "TZ",
  "UA", "US", "UY", "VE", "XK", "ZA", "ZW",
];
