export const PRICE_CENTS = 2250;
export const CURRENCY = "usd";

export const PRODUCT_BY_FIT = {
  unisex: {
    label: "Unisex",
    sku: "GLOBAL-TEE-BC-3001",
    description: "Bella + Canvas 3001 unisex classic T-shirt"
  },
  fitted: {
    label: "Fitted",
    sku: "GLOBAL-TEE-BC-6004",
    description: "Bella + Canvas 6004 fitted T-shirt"
  }
} as const;

export const SIZES = ["S", "M", "L", "XL"] as const;

export type Fit = keyof typeof PRODUCT_BY_FIT;
export type Size = (typeof SIZES)[number];

export type ProductSelection = {
  fit: Fit;
  size: Size;
  timestamp: number;
};

export function parseSelection(input: unknown): ProductSelection | null {
  if (!input || typeof input !== "object") return null;
  const value = input as Record<string, unknown>;
  if (value.fit !== "unisex" && value.fit !== "fitted") return null;
  if (!SIZES.includes(value.size as Size)) return null;
  if (typeof value.timestamp !== "number" || !Number.isSafeInteger(value.timestamp)) return null;

  const now = Date.now();
  const tenMinutes = 10 * 60 * 1000;
  if (value.timestamp < now - tenMinutes || value.timestamp > now + tenMinutes) return null;

  return { fit: value.fit, size: value.size as Size, timestamp: value.timestamp };
}

export function selectionFromMetadata(metadata: Record<string, string> | null): ProductSelection {
  const fit = metadata?.fit;
  const size = metadata?.size;
  const timestamp = Number(metadata?.timestamp);
  if ((fit !== "unisex" && fit !== "fitted") || !SIZES.includes(size as Size) || !Number.isSafeInteger(timestamp)) {
    throw new Error("Checkout Session has invalid product metadata.");
  }
  return { fit, size: size as Size, timestamp };
}
