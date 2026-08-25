import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { fulfillCheckoutSession } from "@/lib/fulfillment";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!sessionId || !sessionId.startsWith("cs_")) return NextResponse.json({ error: "Invalid order reference" }, { status: 400 });

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") return NextResponse.json({ status: "waiting" });
    const order = await fulfillCheckoutSession(session, request.nextUrl.origin);
    return NextResponse.json({
      status: "confirmed",
      orderId: order.id,
      timestamp: session.metadata?.timestamp,
      email: session.customer_details?.email,
    });
  } catch (error) {
    console.error("Order status check failed", error);
    return NextResponse.json({ status: "processing" }, { status: 202 });
  }
}
