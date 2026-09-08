import { z } from "zod";
export const COLORS = ["black", "white", "navy blue"] as const;
export const SIZES = ["s", "m", "l", "xl", "2xl"] as const;
export const orderSchema = z.object({ name:z.string().trim().min(2).max(28).regex(/^[a-zA-Z0-9 .,'-]+$/, "Use letters, numbers, and basic punctuation."), time:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), ritual:z.string().trim().min(3).max(42).regex(/^[a-zA-Z0-9 .,'&!+-]+$/, "Use letters, numbers, and basic punctuation."), city:z.string().trim().min(2).max(30).regex(/^[a-zA-Z0-9 .,'-]+$/, "Use letters, numbers, and basic punctuation."), color:z.enum(COLORS), size:z.enum(SIZES), quantity:z.number().int().min(1).max(4) });
export type TeeOrder = z.infer<typeof orderSchema>;
export function artworkText(order:TeeOrder) { return { headline:`THE ${order.time} CLUB`, name:order.name.toUpperCase(), ritual:order.ritual.toUpperCase(), city:order.city.toUpperCase() }; }
