import { NextRequest, NextResponse } from "next/server";
import { fulfillCheckout } from "../../../lib/fulfillment";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!sessionId || !sessionId.startsWith("cs_")) {
    return NextResponse.json({ error: "Missing checkout session." }, { status: 400 });
  }

  try {
    const result = await fulfillCheckout(sessionId);
    if (result.state === "unpaid") return NextResponse.json({ status: "processing" });
    return NextResponse.json({
      status: "confirmed",
      orderId: result.prodigiOrderId,
      stage: result.prodigiStage || "Submitted",
      timestamp: result.session.metadata?.timestamp,
      size: result.session.metadata?.size,
      email: result.session.customer_details?.email,
    });
  } catch (error) {
    console.error("Order status failed", error);
    return NextResponse.json({ status: "paid", error: "Payment succeeded, but fulfillment needs attention." }, { status: 202 });
  }
}
