export const PRODUCT = {
  sku: "GLOBAL-TEE-GIL-2000",
  name: "The Exact Moment Tee",
  unitAmount: 3600,
  currency: "usd",
  allowedSizes: ["S", "M", "L", "XL", "2XL"] as const,
  color: "black",
} as const;

const prodigiSizes: Record<(typeof PRODUCT.allowedSizes)[number], string> = {
  S: "s",
  M: "m",
  L: "l",
  XL: "xl",
  "2XL": "2xl",
};

export type ProductSize = (typeof PRODUCT.allowedSizes)[number];

export function toProdigiSize(size: ProductSize) {
  return prodigiSizes[size];
}

export function parseOrderInput(value: unknown) {
  if (!value || typeof value !== "object") throw new Error("Choose a moment and size first.");
  const input = value as Record<string, unknown>;
  const timestamp = Number(input.timestamp);
  const quantity = Number(input.quantity);
  const size = String(input.size).toUpperCase() as ProductSize;

  if (!Number.isInteger(timestamp) || String(timestamp).length !== 13) throw new Error("That moment is not a valid millisecond timestamp.");
  if (timestamp > Date.now() + 60_000 || timestamp < Date.now() - 86_400_000) throw new Error("Please freeze a fresh moment from the live clock.");
  if (!PRODUCT.allowedSizes.includes(size)) throw new Error("Please choose an available size.");
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 5) throw new Error("Quantity must be between 1 and 5.");

  return { timestamp, quantity, size, color: PRODUCT.color };
}
