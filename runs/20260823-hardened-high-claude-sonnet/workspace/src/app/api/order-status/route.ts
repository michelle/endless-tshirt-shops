import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const paymentIntentId = req.nextUrl.searchParams.get("payment_intent");
  if (!paymentIntentId) {
    return NextResponse.json({ error: "Missing payment_intent" }, { status: 400 });
  }

  const pi = await stripe().paymentIntents.retrieve(paymentIntentId);

  return NextResponse.json({
    paymentStatus: pi.status,
    fulfillmentStatus: pi.metadata.fulfillment_status || "pending",
    fulfillmentError: pi.metadata.fulfillment_error || null,
    orderId: pi.metadata.sp_order_id || null,
  });
}
