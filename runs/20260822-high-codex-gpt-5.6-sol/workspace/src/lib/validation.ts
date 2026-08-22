import { z } from "zod";

export const orderOptionsSchema = z.object({
  style: z.enum(["fitted", "unisex"]),
  size: z.enum(["S", "M", "L", "XL"]),
  timestamp: z.number().int().min(1_500_000_000_000).max(4_000_000_000_000),
});

export type OrderOptions = z.infer<typeof orderOptionsSchema>;
