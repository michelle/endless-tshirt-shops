import { NextRequest, NextResponse } from "next/server";
import { fulfillCheckoutSession } from "@/lib/fulfillment";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!sessionId || !sessionId.startsWith("cs_")) return NextResponse.json({ error: "Invalid order reference." }, { status: 400 });
  try {
    return NextResponse.json(await fulfillCheckoutSession(sessionId));
  } catch (error) {
    console.error("order_fulfillment_error", error instanceof Error ? error.message : error);
    return NextResponse.json({ status: "failed", error: "We received your payment, but fulfillment needs attention. Please keep this page for your records." }, { status: 502 });
  }
}
