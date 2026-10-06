// lib/validate.ts
// Common validators used by API routes to sanitise the design payload.

import { z } from "zod";

export const paletteEnum = z.enum(["ink", "ivory", "rose", "sage"]);
export const garmentColorEnum = z.enum([
  "white",
  "black",
  "navy blue",
  "natural",
  "sand",
  "military green",
]);
export const garmentSizeEnum = z.enum(["xs", "s", "m", "l", "xl", "2xl", "3xl"]);

export const designSchema = z.object({
  dateIso: z
    .string()
    .min(8)
    .max(40)
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(Z|[+-]\d{2}:?\d{2})?$/i, {
      message: "dateIso must be an ISO-8601 datetime",
    }),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  placeName: z.string().min(2).max(80),
  headline: z.string().min(2).max(60),
  subtitle: z.string().max(60).default(""),
  message: z.array(z.string().min(1).max(48)).max(4).default([]),
  palette: paletteEnum,
  garmentColor: garmentColorEnum,
  garmentSize: garmentSizeEnum,
  quantity: z.number().int().min(1).max(3).default(1),
});

export type DesignInputValidated = z.infer<typeof designSchema>;
