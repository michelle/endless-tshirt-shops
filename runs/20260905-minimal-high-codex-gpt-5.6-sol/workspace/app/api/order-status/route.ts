import { NextResponse } from "next/server";
import { fulfillCheckoutSession } from "@/lib/fulfillment";
import { getStripe } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("session_id") || "";
  if (!/^cs_(test_|live_)?[A-Za-z0-9_]+$/.test(sessionId)) {
    return NextResponse.json({ error: "Invalid order reference." }, { status: 400 });
  }

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (
      session.payment_status !== "paid" &&
      session.payment_status !== "no_payment_required"
    ) {
      return NextResponse.json({ status: "payment_pending" });
    }
    const fulfillment = await fulfillCheckoutSession(session.id);
    return NextResponse.json({
      status: "confirmed",
      orderId: fulfillment.orderId,
      timestamp: session.metadata?.timestamp,
      email: session.customer_details?.email,
    });
  } catch (error) {
    console.error("[order-status]", error);
    return NextResponse.json(
      {
        status: "fulfillment_pending",
        error: "Payment is safe. We’re still submitting your print order.",
      },
      { status: 202 },
    );
  }
}
