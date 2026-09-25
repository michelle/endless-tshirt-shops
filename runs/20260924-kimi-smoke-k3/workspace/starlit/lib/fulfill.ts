// Fulfillment: turns a paid order into a Prodigi print order.
// This module must only be invoked after payment is confirmed
// (Stripe webhook `checkout.session.completed`, or a verified
// successful charge in the sandbox gateway).

import { createShirtOrder, type ProdigiOrderResult } from "./prodigi";
import {
  appUrl,
  signPayload,
  type OrderConfig,
  type ShippingAddress,
} from "./order";
import type { SkyConfig } from "./starmap";

export function designUrlFor(cfg: SkyConfig & { color: string; size: string }): string {
  const token = signPayload({
    lat: cfg.lat,
    lng: cfg.lng,
    date: cfg.date,
    time: cfg.time,
    place: cfg.place,
    title: cfg.title,
    theme: cfg.theme,
  });
  return `${appUrl()}/api/design?p=${encodeURIComponent(token)}`;
}

export async function fulfillOrder(
  cfg: OrderConfig,
  ship: ShippingAddress
): Promise<ProdigiOrderResult> {
  const designUrl = designUrlFor(cfg);
  return createShirtOrder(cfg, ship, designUrl);
}
