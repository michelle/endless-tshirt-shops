import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getOrder } from "@/lib/prodigi";

/**
 * Order status for the success page: is the session paid, and has the shirt
 * been sent to the print network? Read-only; keyed by Stripe session id.
 */

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id") ?? "";
  if (!sessionId.startsWith("cs_")) {
    return NextResponse.json({ error: "Missing session id." }, { status: 400 });
  }

  try {
    const session = await stripe().checkout.sessions.retrieve(sessionId);
    const piId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;

    let prodigiOrderId: string | undefined;
    let fulfillment: string | undefined;
    if (piId) {
      const pi = await stripe().paymentIntents.retrieve(piId);
      prodigiOrderId = pi.metadata?.prodigi_order_id;
      fulfillment = pi.metadata?.fulfillment_status;
    }

    let stage: string | undefined;
    if (prodigiOrderId) {
      const order = await getOrder(prodigiOrderId);
      stage = order?.status?.stage;
    }

    return NextResponse.json({
      paid: session.payment_status === "paid",
      paymentStatus: session.payment_status,
      prodigiOrderId,
      fulfillment,
      stage,
    });
  } catch (err) {
    console.error("order status lookup failed:", err);
    return NextResponse.json({ error: "Lookup failed." }, { status: 500 });
  }
}
