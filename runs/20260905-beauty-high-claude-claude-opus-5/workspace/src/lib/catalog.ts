/**
 * The whole store, in one file.
 *
 * We sell exactly one thing: a t-shirt with a moment printed on it.
 * Everything below is the small number of choices you get to make about it.
 */

export type FitId = "unisex" | "fitted";
export type ColorwayId = "midnight" | "daylight" | "deepfield" | "static";
export type ShippingId = "standard" | "express";

export type Fit = {
  id: FitId;
  /** Shown to humans. */
  name: string;
  blurb: string;
  /** Prodigi SKU. */
  sku: string;
  /** Prodigi size attribute values, in the order we show them. */
  sizes: readonly string[];
  /** Human labels for those sizes. */
  sizeLabels: Record<string, string>;
};

export const FITS: Record<FitId, Fit> = {
  unisex: {
    id: "unisex",
    name: "Unisex",
    blurb: "Bella + Canvas 3001. Boxy, honest, 100% airlume cotton.",
    sku: "GLOBAL-TEE-BC-3001",
    sizes: ["xs", "s", "m", "l", "xl", "2xl", "3xl"],
    sizeLabels: { xs: "XS", s: "S", m: "M", l: "L", xl: "XL", "2xl": "2XL", "3xl": "3XL" },
  },
  fitted: {
    id: "fitted",
    name: "Fitted",
    blurb: "Bella + Canvas 6004. Tapered, featherweight, slightly vain.",
    sku: "GLOBAL-TEE-BC-6004",
    sizes: ["s", "m", "l", "xl", "2xl"],
    sizeLabels: { s: "S", m: "M", l: "L", xl: "XL", "2xl": "2XL" },
  },
};

export type Colorway = {
  id: ColorwayId;
  name: string;
  poetry: string;
  /** Prodigi `color` attribute — must exist on BOTH skus above. */
  prodigiColor: string;
  /** Garment colour, for the on-screen render. */
  cloth: string;
  /** Deeper tone used for folds and shadow. */
  clothShade: string;
  /** Lighter tone used for the highlight along the shoulder. */
  clothLight: string;
  /** The colour of the print. */
  ink: string;
  /** True when the garment is dark enough to need light ink. */
  dark: boolean;
};

export const COLORWAYS: Record<ColorwayId, Colorway> = {
  midnight: {
    id: "midnight",
    name: "Midnight",
    poetry: "the hour with no witnesses",
    prodigiColor: "black",
    cloth: "#191614",
    clothShade: "#000000",
    clothLight: "#3B3633",
    ink: "#F6F1E6",
    dark: true,
  },
  daylight: {
    id: "daylight",
    name: "Daylight",
    poetry: "eleven a.m., unremarkable, perfect",
    prodigiColor: "white",
    cloth: "#F4F1EA",
    clothShade: "#D8D2C4",
    clothLight: "#FFFFFF",
    ink: "#15120F",
    dark: false,
  },
  deepfield: {
    id: "deepfield",
    name: "Deep Field",
    poetry: "light that left before you did",
    prodigiColor: "navy blue",
    cloth: "#1E2A44",
    clothShade: "#0D1425",
    clothLight: "#38486B",
    ink: "#F6F1E6",
    dark: true,
  },
  static: {
    id: "static",
    name: "Static",
    poetry: "the fuzz between two stations",
    prodigiColor: "athletic grey heather",
    cloth: "#9B9A95",
    clothShade: "#77766F",
    clothLight: "#BDBCB6",
    ink: "#15120F",
    dark: false,
  },
};

export const FIT_IDS = Object.keys(FITS) as FitId[];
export const COLORWAY_IDS = Object.keys(COLORWAYS) as ColorwayId[];

/** Money, in cents. One price, everywhere, forever. */
export const PRICE = {
  currency: "usd",
  /** What you pay. */
  amount: 3200,
  /** What we pretend you would have paid. */
  wasAmount: 4400,
} as const;

export const SHIPPING: Record<ShippingId, {
  id: ShippingId;
  name: string;
  detail: string;
  amount: number;
  /** Prodigi shipping method. */
  prodigiMethod: "Budget" | "Standard" | "Express";
}> = {
  standard: {
    id: "standard",
    name: "Standard",
    detail: "5–10 days. Time passes either way.",
    amount: 0,
    prodigiMethod: "Standard",
  },
  express: {
    id: "express",
    name: "Express",
    detail: "2–4 days. For the impatient present.",
    amount: 1500,
    prodigiMethod: "Express",
  },
};

export function formatMoney(cents: number, currency: string = PRICE.currency) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

/**
 * Countries Prodigi's global tee network reaches. Kept as an explicit list so
 * Stripe's address element refuses an address we could never actually print to.
 */
export const SHIP_TO = [
  "AE","AR","AT","AU","BE","BG","BR","CA","CH","CL","CN","CO","CY","CZ","DE","DK",
  "EE","ES","FI","FR","GB","GR","HK","HR","HU","IE","IL","IN","IS","IT","JP","KR",
  "LT","LU","LV","MT","MX","MY","NL","NO","NZ","PE","PH","PL","PT","RO","SE","SG",
  "SI","SK","TH","TR","TW","US","ZA",
] as const;
