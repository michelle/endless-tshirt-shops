import { z } from "zod";
const lettering = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .regex(
      /^[A-Za-z0-9 .,!'&()\-]+$/,
      "Use English letters, numbers, and simple punctuation.",
    );
export const designSchema = z
  .object({
    place: lettering(24),
    name: lettering(22),
    year: z.string().regex(/^(19|20)\d{2}$/),
    phrase: lettering(36),
    palette: z.enum(["forest", "dusk", "canyon"]),
    size: z.enum(["s", "m", "l", "xl", "2xl"]),
  })
  .strict();
export type Design = z.infer<typeof designSchema>;
export const defaultDesign: Design = {
  place: "BIG SUR",
  name: "THE PARKER FAMILY",
  year: "2026",
  phrase: "OUR KIND OF WILD",
  palette: "forest",
  size: "m",
};
export const PRICE = 3800;
export const SHIPPING = 600;
export const SKU = "GLOBAL-TEE-GIL-64000";
export const palettes = {
  forest: { label: "Forest", ink: "#233d32", paper: "#f2e8ce", hue: 0 },
  dusk: { label: "Dusk", ink: "#353859", paper: "#e9dfed", hue: 145 },
  canyon: { label: "Canyon", ink: "#6b3629", paper: "#f4dfc3", hue: 320 },
};
