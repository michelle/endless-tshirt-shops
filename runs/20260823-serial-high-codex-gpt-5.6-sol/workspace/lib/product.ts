export const PRODUCT = {
  name: "The Timestamp Tee",
  price: 2250,
  currency: "usd",
} as const;

export const PRODUCTS = {
  // The original fitted blank is still listed but currently returns 500 from
  // Scalable Press quotes. This comparable, active fitted blank is orderable.
  fitted: "gildan-ladies-missy-t-shirt",
  unisex: "next-level-fitted-crew",
} as const;

export const SIZES = {
  S: "sml",
  M: "med",
  L: "lrg",
  XL: "xlg",
} as const;

export type Fit = keyof typeof PRODUCTS;
export type Size = keyof typeof SIZES;
