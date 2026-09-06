import { z } from 'zod';
export const PRICE_CENTS = 2250;
export const SIZES = ['S', 'M', 'L', 'XL'] as const;
export const STYLES = ['unisex', 'fitted'] as const;
export type ShirtStyle = typeof STYLES[number];
export const PRODUCTS = {
  unisex: { name: 'Unisex', detail: 'Classic fit · Gildan 5000', sku: 'GLOBAL-TEE-GIL-5000', chest: [36,40,44,48] },
  fitted: { name: 'Fitted', detail: 'Tailored fit · Bella+Canvas 3001', sku: 'GLOBAL-TEE-BC-3001', chest: [34,38,43,46] },
} as const;
export const momentSchema = z.object({
  timestamp: z.number().int().min(1_000_000_000_000).max(9_999_999_999_999),
  style: z.enum(STYLES), size: z.enum(SIZES),
});
export type Moment = z.infer<typeof momentSchema>;
export function printDimensions() { return { width: 4677, height: 5881 }; }
