export const PRICE_CENTS = 2250;
export const PRODUCT_NAME = "The datetime shirt";

export const fits = {
  fitted: {
    label: "Fitted",
    sku: "GLOBAL-TEE-BC-6004",
    attributes: { color: "black", gender: "Women's" },
  },
  unisex: {
    label: "Unisex",
    sku: "GLOBAL-TEE-BC-3001",
    attributes: { color: "black", gender: "Unisex" },
  },
} as const;

export const sizes = ["S", "M", "L", "XL"] as const;

export type Fit = keyof typeof fits;
export type Size = (typeof sizes)[number];

export function prodigiSize(size: Size) {
  return size.toLowerCase();
}
