import { z } from "zod";
export const PRICE_CENTS = 2250;
export const FITS = ["unisex", "fitted"] as const;
export const SIZES = ["S", "M", "L", "XL"] as const;
export const selectionSchema = z
  .object({ fit: z.enum(FITS), size: z.enum(SIZES) })
  .strict();
export const checkoutSchema = selectionSchema
  .extend({
    timestamp: z.number().int().min(1_000_000_000_000).max(9_999_999_999_999),
    requestId: z.uuid(),
  })
  .strict();
export type Selection = z.infer<typeof selectionSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export const PRODUCTS = {
  unisex: {
    sku: "GLOBAL-TEE-GIL-64000",
    name: "Unisex",
    description: "Gildan 64000 · an easy, everyday shape",
  },
  fitted: {
    sku: "GLOBAL-TEE-GIL-64000L",
    name: "Fitted",
    description: "Gildan 64000L · a closer silhouette",
  },
} as const;
export function itemFor(selection: Selection, artworkUrl?: string) {
  return {
    sku: PRODUCTS[selection.fit].sku,
    copies: 1,
    sizing: "fillPrintArea",
    attributes: { color: "black", size: selection.size.toLowerCase() },
    ...(artworkUrl
      ? { assets: [{ printArea: "front", url: artworkUrl }] }
      : {}),
  };
}
