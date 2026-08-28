import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

// Polled by the success page so we can show live fulfillment status without
// a database: Stripe's PaymentIntent metadata is the system of record for
// "has the Prodigi order been placed yet?".
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });

    const pi = session.payment_intent as Stripe.PaymentIntent | null;
    const metadata = pi?.metadata ?? session.metadata ?? {};

    return NextResponse.json({
      paymentStatus: session.payment_status,
      style: metadata.style,
      size: metadata.size,
      timestampMs: metadata.timestampMs ? Number(metadata.timestampMs) : null,
      email: session.customer_details?.email,
      prodigiOrderId: metadata.prodigiOrderId ?? null,
      prodigiStatus: metadata.prodigiStatus ?? "pending",
      prodigiError: metadata.prodigiError ?? null,
    });
  } catch (err) {
    console.error("order-status error", err);
    return NextResponse.json({ error: "Could not load order." }, { status: 500 });
  }
}
