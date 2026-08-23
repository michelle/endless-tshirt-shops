import { z } from 'zod';
import { SHIRT_SIZES, SHIRT_STYLES } from './catalog';

/** Rough ceiling on the decoded artwork PNG. DTG art at 300dpi lands well under this. */
export const MAX_ARTWORK_BYTES = 3 * 1024 * 1024;

const trimmed = (max: number) => z.string().trim().min(1).max(max);

export const addressSchema = z.object({
  name: trimmed(120),
  address1: trimmed(120),
  address2: z.string().trim().max(120).optional().default(''),
  city: trimmed(80),
  /** Two-letter US state/territory code. Scalable Press wants an abbreviation. */
  state: z
    .string()
    .trim()
    .min(2)
    .max(2)
    .transform((s) => s.toUpperCase()),
  zip: z
    .string()
    .trim()
    .regex(/^\d{5}(-\d{4})?$/, 'Enter a 5-digit US ZIP code'),
  country: z.literal('US').default('US'),
});

export type ShippingAddress = z.infer<typeof addressSchema>;

export const checkoutRequestSchema = z.object({
  email: z.string().trim().email().max(254),
  address: addressSchema,
  style: z.enum(SHIRT_STYLES),
  size: z.enum(SHIRT_SIZES),
  /** Unix ms the customer locked in. This is what gets printed. */
  timestamp: z
    .number()
    .int()
    .positive()
    .max(4_102_444_800_000, 'timestamp is implausibly far in the future'),
  /** `data:image/png;base64,...` render of the timestamp, at print resolution. */
  artwork: z
    .string()
    .startsWith('data:image/png;base64,', 'artwork must be a base64 PNG data URL')
    .max(Math.ceil(MAX_ARTWORK_BYTES * 1.4)),
});

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;

/** Decode a `data:image/png;base64,` URL into a PNG buffer, validating the magic bytes. */
export function decodeArtwork(dataUrl: string): Buffer {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const buf = Buffer.from(base64, 'base64');
  if (buf.byteLength === 0) throw new Error('artwork is empty');
  if (buf.byteLength > MAX_ARTWORK_BYTES) throw new Error('artwork is too large');
  const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!buf.subarray(0, 8).equals(PNG_MAGIC)) throw new Error('artwork is not a PNG');
  return buf;
}
