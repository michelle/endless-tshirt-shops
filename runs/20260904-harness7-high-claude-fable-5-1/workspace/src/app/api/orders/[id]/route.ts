import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { shirtSpecFromMetadata } from "@/lib/fulfillment";

export const runtime = "nodejs";

/**
 * Customer-facing order status. Requires the PaymentIntent's client secret as
 * a bearer token, so only the browser that paid can look the order up.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const auth = req.headers.get("authorization") ?? "";
  const secret = auth.replace(/^Bearer\s+/i, "");
  if (!/^pi_[A-Za-z0-9]+$/.test(id) || !secret.startsWith(`${id}_secret_`)) {
    return NextResponse.json({ error: { code: "unauthorized" } }, { status: 401 });
  }
  const pi = await stripe().paymentIntents.retrieve(id);
  if (pi.client_secret !== secret) {
    return NextResponse.json({ error: { code: "unauthorized" } }, { status: 401 });
  }
  return NextResponse.json({
    id: pi.id,
    paymentStatus: pi.status,
    shirt: shirtSpecFromMetadata(pi.metadata),
    prodigiOrderId: pi.metadata.prodigi_order_id || null,
    prodigiStage: pi.metadata.prodigi_stage || null,
    trackingUrl: pi.metadata.tracking_url || null,
    fulfillmentError: pi.metadata.fulfillment_error || null,
  });
}
