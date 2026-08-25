import { z } from "zod";
import { SIZES, SHIRT_STYLES } from "./catalog";

const styleValues = SHIRT_STYLES.map((style) => style.value) as ["fitted", "unisex"];

export const checkoutSchema = z.object({
  timestamp: z.number().int().min(1_000_000_000_000).max(9_999_999_999_999),
  style: z.enum(styleValues),
  size: z.enum(SIZES),
}).strict();

export type CheckoutInput = z.infer<typeof checkoutSchema>;
