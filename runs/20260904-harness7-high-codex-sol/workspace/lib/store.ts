export const PRODUCT = {
  name: "The Timestamp Tee",
  sku: "GLOBAL-TEE-BC-3001",
  unitAmount: 2400,
  currency: "usd",
  sizes: ["XS", "S", "M", "L", "XL", "2XL"] as const,
  color: "black",
} as const;

export type StoreSize = (typeof PRODUCT.sizes)[number];

export function isStoreSize(value: unknown): value is StoreSize {
  return typeof value === "string" && PRODUCT.sizes.includes(value as StoreSize);
}

export function isTimestamp(value: unknown): value is number {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) return false;
  const now = Date.now();
  return value >= now - 5 * 60_000 && value <= now + 60_000;
}

export function prodigiSize(size: StoreSize) {
  return size.toLowerCase();
}
