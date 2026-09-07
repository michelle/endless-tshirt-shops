import { NextResponse } from "next/server";
import { fulfillCheckout } from "@/lib/fulfillment";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("session_id");
  if (!sessionId?.startsWith("cs_")) return NextResponse.json({ status: "invalid" }, { status: 400 });

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") return NextResponse.json({ status: "awaiting_payment" });

    const result = await fulfillCheckout(session);
    return NextResponse.json({
      status: "confirmed",
      orderId: result.orderId,
      timestamp: session.metadata?.timestamp,
      fit: session.metadata?.fit,
      size: session.metadata?.size,
    });
  } catch (error) {
    console.error("Order status error", error);
    return NextResponse.json({ status: "processing" }, { status: 202 });
  }
}
