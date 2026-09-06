import "server-only";
import type Stripe from "stripe";
import type { FulfillmentResult } from "./fulfill";
import { describeStage, type ProdigiOrder } from "./prodigi";
import type { ShirtSize, ShirtStyle } from "./config";

/** Everything the success page needs to know, and nothing it shouldn't. */
export type OrderStatus = {
  id: string;
  payment: Stripe.PaymentIntent.Status;
  fulfillment: "unpaid" | "fulfilled" | "failed";
  error: string | null;
  timestamp: number;
  style: ShirtStyle | string;
  size: ShirtSize | string;
  shipTo: { name: string; city: string | null; country: string | null } | null;
  email: string | null;
  prodigi: {
    id: string;
    stage: string;
    key: ReturnType<typeof describeStage>["key"];
    label: string;
    blurb: string;
    details: Record<string, string> | null;
    tracking: { number?: string; url?: string } | null;
    carrier: { name?: string; service?: string } | null;
  } | null;
};

export function buildOrderStatus(result: FulfillmentResult, prodigiOrder: ProdigiOrder | null): OrderStatus {
  const pi = result.pi;
  const stage = describeStage(prodigiOrder);
  const shipment = prodigiOrder?.shipments?.find((s) => s.tracking?.number || s.tracking?.url);
  return {
    id: pi.id,
    payment: pi.status,
    fulfillment: result.state,
    error: result.state === "failed" ? result.error : null,
    timestamp: Number(pi.metadata.timestamp),
    style: pi.metadata.style,
    size: pi.metadata.size,
    shipTo: pi.shipping
      ? {
          name: pi.shipping.name || "",
          city: pi.shipping.address?.city ?? null,
          country: pi.shipping.address?.country ?? null,
        }
      : null,
    email: pi.receipt_email,
    prodigi: prodigiOrder
      ? {
          id: prodigiOrder.id,
          stage: prodigiOrder.status?.stage ?? "",
          key: stage.key,
          label: stage.label,
          blurb: stage.blurb,
          details: prodigiOrder.status?.details ?? null,
          tracking: shipment?.tracking ?? null,
          carrier: shipment?.carrier ?? null,
        }
      : null,
  };
}
