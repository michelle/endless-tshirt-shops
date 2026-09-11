import { NextRequest, NextResponse } from "next/server";
import { fulfillStripeSession } from "../../../../lib/fulfillment";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();
    if (!sessionId || typeof sessionId !== "string") return NextResponse.json({ error: "Missing checkout session." }, { status: 400 });
    const result = await fulfillStripeSession(sessionId, request.nextUrl.origin);
    return NextResponse.json({ ok: true, orderId: result.order?.id ?? null, order: result.order });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Payment confirmation failed." }, { status: 400 });
  }
}
