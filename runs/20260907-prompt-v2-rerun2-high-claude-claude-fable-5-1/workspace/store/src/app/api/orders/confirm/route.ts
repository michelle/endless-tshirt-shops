import { NextResponse } from "next/server";
import { fulfilSession, retrieveSession } from "@/lib/fulfil";
import { stripeConfigured } from "@/lib/stripe";

/** Called by the success page: confirms payment and returns (creating if needed) the Prodigi order. */
export async function POST(req: Request) {
  if (!stripeConfigured()) return NextResponse.json({ error: "Payments not configured" }, { status: 503 });
  const { sessionId } = await req.json().catch(() => ({}));
  if (typeof sessionId !== "string" || !sessionId.startsWith("cs_")) {
    return NextResponse.json({ error: "Missing session id" }, { status: 400 });
  }
  try {
    const session = await retrieveSession(sessionId);
    if (session.payment_status !== "paid") {
      return NextResponse.json({ paid: false, status: session.payment_status });
    }
    const { order } = await fulfilSession(session);
    return NextResponse.json({
      paid: true,
      email: session.customer_details?.email ?? null,
      orderId: order.id,
      stage: order.status.stage,
    });
  } catch (e) {
    console.error("confirm error", e);
    return NextResponse.json({ error: "Could not confirm the order." }, { status: 500 });
  }
}
