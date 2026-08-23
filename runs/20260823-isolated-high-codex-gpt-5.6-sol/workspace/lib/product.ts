import { z } from "zod";

export const PRICE_CENTS = 2250;
export const SHIRT_SIZES = ["S", "M", "L", "XL"] as const;
export const SHIRT_STYLES = [
  { value: "fitted", label: "Fitted", description: "A closer silhouette" },
  { value: "unisex", label: "Unisex", description: "A classic straight cut" },
] as const;

export type ShirtSize = (typeof SHIRT_SIZES)[number];
export type ShirtStyle = (typeof SHIRT_STYLES)[number]["value"];

export const orderSelectionSchema = z.object({
  style: z.enum(["fitted", "unisex"]),
  size: z.enum(SHIRT_SIZES),
  capturedAt: z.number().int().min(1_500_000_000_000).max(9_999_999_999_999),
});

export const SP_PRODUCTS: Record<ShirtStyle, string> = {
  fitted: "next-level-boyfriend-tee",
  unisex: "next-level-fitted-crew",
};

export const SP_SIZES: Record<ShirtSize, string> = {
  S: "sml",
  M: "med",
  L: "lrg",
  XL: "xlg",
};
