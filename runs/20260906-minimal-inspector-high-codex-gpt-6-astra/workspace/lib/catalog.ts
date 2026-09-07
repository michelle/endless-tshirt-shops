import { z } from 'zod';
export const PRICE = 2250;
export const FITS = ['unisex', 'fitted'] as const;
export const SIZES = ['S', 'M', 'L', 'XL'] as const;
export const selectionSchema = z
  .object({
    fit: z.enum(FITS),
    size: z.enum(SIZES),
    timestamp: z.number().int().min(1000000000000).max(9999999999999),
  })
  .strict();
export const checkoutSchema = selectionSchema
  .extend({ requestId: z.uuid() })
  .strict();
export type Selection = z.infer<typeof selectionSchema>;
export const CATALOG = {
  unisex: {
    sku: 'GLOBAL-TEE-BC-3001',
    name: 'Unisex',
    width: 4677,
    height: 5881,
  },
  fitted: {
    sku: 'GLOBAL-TEE-BC-6004',
    name: 'Fitted',
    width: 4665,
    height: 5844,
  },
};
export function productItem(selection: Selection) {
  return {
    sku: CATALOG[selection.fit].sku,
    copies: 1,
    attributes: { color: 'black', size: selection.size.toLowerCase() },
    assets: [{ printArea: 'front' }],
  };
}
export function validateMoment(timestamp: number, now = Date.now()) {
  if (Math.abs(now - timestamp) > 120000)
    throw new Error(
      'Your device clock is out of sync. Set it to automatic, then try again.',
    );
}
