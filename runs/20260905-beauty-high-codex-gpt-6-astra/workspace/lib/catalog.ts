import { z } from "zod";
export const PRICE = 3200;
export const SIZES = ["S", "M", "L", "XL", "2XL"] as const;
export const COLORS = [
  { id: "black", name: "Midnight", hex: "#252525", ink: "#f8f5e9" },
  { id: "white", name: "Cloud", hex: "#fffef9", ink: "#22231f" },
  { id: "natural", name: "Oat milk", hex: "#e9dcc0", ink: "#22231f" },
] as const;
export const purchaseSchema = z
  .object({
    timestamp: z.number().int().min(0).max(8640000000000000),
    color: z.enum(["black", "white", "natural"]),
    size: z.enum(SIZES),
    fit: z.enum(["unisex", "fitted"]),
    requestId: z.string().uuid(),
  })
  .strict()
  .refine((d) => !(d.fit === "fitted" && d.color === "natural"), {
    message: "Oat milk is available in the unisex fit.",
  });
export type Purchase = z.infer<typeof purchaseSchema>;
export const SKUS = {
  unisex: "GLOBAL-TEE-GIL-64000",
  fitted: "GLOBAL-TEE-GIL-64000L",
};
export function readableMoment(timestamp: number) {
  return (
    new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "UTC",
    }).format(new Date(timestamp)) + " UTC"
  );
}
export function assertRecentTimestamp(timestamp: number, now = Date.now()) {
  if (timestamp > now + 30_000 || timestamp < now - 30 * 60_000)
    throw new Error(
      "That moment has slipped away. Capture a fresh one and try again.",
    );
}
