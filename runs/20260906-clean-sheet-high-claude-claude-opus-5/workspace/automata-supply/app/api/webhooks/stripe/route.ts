import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { fulfilSession, recordFailure } from "@/lib/fulfil";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  // Signature verification needs the exact bytes Stripe signed.
  const raw = await req.text();
  const client = stripe();

  let event;
  try {
    event = client.webhooks.constructEvent(raw, signature, secret);
  } catch (e) {
    const message = e instanceof Error ? e.message : "bad signature";
    console.error("[webhook] signature verification failed:", message);
    return NextResponse.json({ error: `Invalid signature: ${message}` }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  const short = event.data.object as { id: string };

  // Re-fetch rather than trusting the event payload: we need the shipping rate
  // expanded, and the session may have been updated since the event was queued.
  const session = await client.checkout.sessions.retrieve(short.id, {
    expand: ["shipping_cost.shipping_rate", "payment_intent"],
  });

  if (session.payment_status !== "paid") {
    return NextResponse.json({ received: true, skipped: "not paid" });
  }

  const result = await fulfilSession(client, session);

  if (result.status === "failed") {
    console.error("[webhook] fulfilment failed for", session.id, result.error);
    await recordFailure(client, session, result.error);
    // Retryable failures return 5xx so Stripe redelivers; permanent ones are
    // acknowledged, because redelivering a rejected payload changes nothing.
    return NextResponse.json(
      { error: result.error },
      { status: result.retryable ? 500 : 200 },
    );
  }

  // The webhook never passes minAgeSecondsBeforeCreate, so "waiting" cannot
  // occur here; handle it defensively rather than asserting.
  if (result.status === "waiting") {
    return NextResponse.json({ received: true, skipped: "waiting" });
  }

  console.log("[webhook]", result.status, "prodigi order", result.orderId, "for", session.id);
  return NextResponse.json({ received: true, prodigiOrderId: result.orderId });
}
