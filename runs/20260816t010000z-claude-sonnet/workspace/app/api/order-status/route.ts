import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { ensureFulfilled } from "@/lib/fulfillment";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "session_id is required." }, { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });

    // The webhook may not be configured in every environment, so this poll
    // also drives fulfillment forward. ensureFulfilled() is idempotent.
    await ensureFulfilled(session);

    const paymentIntentId =
      typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
    const paymentIntent = paymentIntentId
      ? await stripe.paymentIntents.retrieve(paymentIntentId)
      : null;
    const metadata = paymentIntent?.metadata || {};

    return NextResponse.json({
      payment_status: session.payment_status,
      fulfillment_status: metadata.fulfillment_status || "processing",
      order_id: metadata.sp_order_id || null,
      error: metadata.fulfillment_error || null,
      style: session.metadata?.style,
      size: session.metadata?.size,
      timestamp: session.metadata?.timestamp ? Number(session.metadata.timestamp) : null,
      email: session.customer_details?.email || null,
    });
  } catch (err) {
    console.error("[order-status] lookup failed", err);
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
}
