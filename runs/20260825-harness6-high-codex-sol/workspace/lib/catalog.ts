export const PRICE_CENTS = 2250;

export const SHIRT_STYLES = [
  { value: "fitted", label: "Fitted", description: "Bella + Canvas 6004", sku: "GLOBAL-TEE-BC-6004" },
  { value: "unisex", label: "Unisex", description: "Bella + Canvas 3003", sku: "GLOBAL-TEE-BC-3003" },
] as const;

export const SIZES = ["S", "M", "L", "XL"] as const;

export type ShirtStyle = (typeof SHIRT_STYLES)[number]["value"];
export type ShirtSize = (typeof SIZES)[number];

export function getShirt(style: ShirtStyle) {
  return SHIRT_STYLES.find((shirt) => shirt.value === style)!;
}
