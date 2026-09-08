import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { fulfillSession } from "@/lib/fulfill";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Payment-confirming events. Nothing is sent to the printer outside these. */
const FULFILL_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
]);

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, signature, secret);
  } catch (err) {
    console.error("[webhook] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (!FULFILL_EVENTS.has(event.type)) {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  try {
    const result = await fulfillSession(session.id);
    if (result.status === "error") {
      // 500 makes Stripe retry — the payment succeeded, so this must not be
      // silently dropped.
      return NextResponse.json({ error: result.message }, { status: 500 });
    }
    return NextResponse.json({ received: true, result });
  } catch (err) {
    console.error("[webhook] fulfilment threw", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Fulfilment failed" },
      { status: 500 }
    );
  }
}
