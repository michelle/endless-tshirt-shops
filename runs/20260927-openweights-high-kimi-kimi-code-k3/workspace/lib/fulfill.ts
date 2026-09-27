import type { DesignParams } from "./design";
import { createShirtOrder, type Recipient } from "./prodigi";

/**
 * The single point where a paid order becomes a Prodigi print order.
 * Must only be called after payment has been confirmed.
 */
export async function fulfillPaidOrder(args: {
  ref: string;
  design: DesignParams;
  recipient: Recipient;
  origin: string;
  artToken: string;
}) {
  const artUrl = `${args.origin}/api/art/${args.artToken}.png`;
  const order = await createShirtOrder({
    ref: args.ref,
    artUrl,
    size: args.design.size,
    color: args.design.color,
    recipient: args.recipient,
  });
  return order;
}

export function requestOrigin(req: Request): string {
  if (process.env.BASE_URL) return process.env.BASE_URL.replace(/\/$/, "");
  const host =
    req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const proto = req.headers.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}
