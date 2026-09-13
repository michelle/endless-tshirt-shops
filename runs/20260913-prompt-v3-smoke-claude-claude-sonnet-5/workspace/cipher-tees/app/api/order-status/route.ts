import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { getSiteUrl } from "@/lib/site";
import { decodeItemsFromMetadata, artUrlForItem } from "@/lib/orderMeta";
import { getProdigiOrder } from "@/lib/prodigi";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const sessionId = new URL(req.url).searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "session_id is required" }, { status: 400 });
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });
  } catch (err) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const paymentIntent =
    typeof session.payment_intent === "object" && session.payment_intent !== null
      ? session.payment_intent
      : null;
  const metadata = (paymentIntent?.metadata ?? session.metadata ?? {}) as Record<string, string>;
  const items = decodeItemsFromMetadata(metadata);
  const siteUrl = getSiteUrl();

  const prodigiOrderId = metadata.prodigi_order_id ?? null;
  let prodigiStatus = metadata.prodigi_status ?? null;
  let shipments: { carrier: string; service: string; trackingNumber?: string; trackingUrl?: string }[] = [];

  if (prodigiOrderId) {
    const order = await getProdigiOrder(prodigiOrderId);
    if (order) {
      prodigiStatus = order.status.stage;
      shipments = (order.shipments ?? []).map((s: any) => ({
        carrier: s.carrier?.name,
        service: s.carrier?.service,
        trackingNumber: s.trackingNumber,
        trackingUrl: s.trackingUrl,
      }));
    }
  }

  const shippingDetails = (session as unknown as { shipping_details?: Stripe.Checkout.Session.ShippingDetails })
    .shipping_details;

  return NextResponse.json({
    paid: session.payment_status === "paid",
    email: session.customer_details?.email ?? null,
    amountTotal: session.amount_total,
    currency: session.currency,
    shippingAddress: shippingDetails?.address ?? session.customer_details?.address ?? null,
    shippingName: shippingDetails?.name ?? session.customer_details?.name ?? null,
    items: items.map((item) => ({ ...item, previewUrl: artUrlForItem(siteUrl, item) })),
    prodigiOrderId,
    prodigiStatus,
    shipments,
    fulfillmentError: metadata.prodigi_error ?? null,
  });
}
