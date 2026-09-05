import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });
  } catch {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const paymentIntent =
    typeof session.payment_intent === "object" ? session.payment_intent : null;

  return NextResponse.json({
    paymentStatus: session.payment_status,
    style: session.metadata?.style ?? null,
    size: session.metadata?.size ?? null,
    ts: session.metadata?.ts ?? null,
    customerEmail: session.customer_details?.email ?? null,
    prodigiOrderId: paymentIntent?.metadata?.prodigi_order_id || null,
    prodigiStatus: paymentIntent?.metadata?.prodigi_status || null,
  });
}
