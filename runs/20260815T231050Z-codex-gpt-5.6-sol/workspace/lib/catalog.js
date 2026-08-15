export const PRICE_CENTS = 2250;
export const STYLES = {
  fitted: { label: "Fitted", productId: "bella-ladies-favorite-t-shirt" },
  unisex: { label: "Unisex", productId: "next-level-fitted-crew" },
};
export const SIZES = { S: "sml", M: "med", L: "lrg", XL: "xlg" };

export function validSelection(style, size) {
  return Object.hasOwn(STYLES, style) && Object.hasOwn(SIZES, size);
}

export function timestampLabel(timestamp) {
  const value = Number(timestamp);
  if (!Number.isSafeInteger(value) || value < 1_500_000_000_000 || value > Date.now() + 60_000) return null;
  return String(value);
}
