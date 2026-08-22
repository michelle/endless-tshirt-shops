import type Stripe from "stripe";
import { getStripe } from "./stripe";
import { orderOptionsSchema } from "./validation";
import { createScalablePressOrder } from "./scalable-press";

type ShippingShape = { name?: string | null; address?: { line1?: string | null; line2?: string | null; city?: string | null; state?: string | null; postal_code?: string | null; country?: string | null } | null };

function getShipping(session: Stripe.Checkout.Session): ShippingShape | undefined {
  const compatibilitySession = session as Stripe.Checkout.Session & {
    shipping_details?: ShippingShape;
    collected_information?: { shipping_details?: ShippingShape };
  };
  return compatibilitySession.collected_information?.shipping_details || compatibilitySession.shipping_details;
}

export async function fulfillCheckoutSession(sessionId: string) {
  const stripe = getStripe();
  let session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid") return { status: "pending" as const };
  if (session.metadata?.fulfillment_status === "complete") {
    return { status: "complete" as const, orderId: session.metadata.sp_order_id, mode: session.metadata.sp_mode };
  }

  if (session.metadata?.fulfillment_status === "processing") {
    const startedAt = Number(session.metadata.fulfillment_started_at || 0);
    if (Date.now() - startedAt < 5 * 60_000) return { status: "processing" as const };
  }

  const parsed = orderOptionsSchema.safeParse({
    style: session.metadata?.style,
    size: session.metadata?.size,
    timestamp: Number(session.metadata?.timestamp),
  });
  if (!parsed.success) throw new Error("Order metadata is invalid.");
  const shipping = getShipping(session);
  const address = shipping?.address;
  if (!shipping?.name || !address?.line1 || !address.city || !address.state || !address.postal_code || !address.country) {
    throw new Error("The order is missing a complete shipping address.");
  }

  session = await stripe.checkout.sessions.update(sessionId, {
    metadata: { ...session.metadata, fulfillment_status: "processing", fulfillment_started_at: String(Date.now()) },
  });

  try {
    const result = await createScalablePressOrder(parsed.data, {
      name: shipping.name,
      address1: address.line1,
      address2: address.line2 || undefined,
      city: address.city,
      state: address.state,
      zip: address.postal_code,
      country: address.country,
    });
    await stripe.checkout.sessions.update(sessionId, {
      metadata: { ...session.metadata, fulfillment_status: "complete", sp_order_id: result.id, sp_design_id: result.designId, sp_mode: result.status },
    });
    return { status: "complete" as const, orderId: result.id, mode: result.status };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown fulfillment error";
    await stripe.checkout.sessions.update(sessionId, {
      metadata: { ...session.metadata, fulfillment_status: "failed", fulfillment_error: message.slice(0, 450) },
    });
    throw error;
  }
}
