import { z } from 'zod';

import { SHIRT_SIZES, SHIRT_STYLES } from './catalog';

/**
 * A shirt is only worth buying if the number on it is *the moment you bought
 * it*, so we refuse timestamps that drifted too far from server time. This also
 * stops anyone from ordering a shirt printed with an arbitrary number.
 */
export const TIMESTAMP_TOLERANCE_MS = 10 * 60 * 1000;

const trimmed = (max: number) => z.string().trim().min(1).max(max);

export const addressSchema = z.object({
  name: trimmed(80),
  address1: trimmed(120),
  address2: z.string().trim().max(120).optional().or(z.literal('')),
  city: trimmed(60),
  state: trimmed(40),
  zip: trimmed(16),
  // US-only for now: shipping is priced as free, and Scalable Press domestic
  // rates are the only ones that make that sustainable.
  country: z.literal('US'),
  phone: z.string().trim().max(32).optional().or(z.literal('')),
});

export const checkoutSchema = z.object({
  timestampMs: z.number().int().positive(),
  style: z.enum(SHIRT_STYLES),
  size: z.enum(SHIRT_SIZES),
  email: z.string().trim().email().max(160),
  address: addressSchema,
  /** Reuse an intent from a previous attempt (e.g. after a card decline). */
  paymentIntentId: z.string().trim().max(120).optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export function timestampIsFresh(timestampMs: number, now = Date.now()): boolean {
  return Math.abs(now - timestampMs) <= TIMESTAMP_TOLERANCE_MS;
}
