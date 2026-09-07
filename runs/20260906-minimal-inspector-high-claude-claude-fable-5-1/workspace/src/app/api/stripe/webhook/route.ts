import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { fulfillPaymentIntent } from "@/lib/fulfill";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

/**
 * POST /api/stripe/webhook
 * Primary fulfilment trigger: when a PaymentIntent succeeds, place the Prodigi
 * order. Idempotent, so Stripe retries and the client-side poll are harmless.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const payload = await req.text();
    event = stripe().webhooks.constructEvent(payload, signature, secret);
  } catch (err) {
    console.warn("[webhook] signature verification failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    // Re-fetch rather than trusting the event snapshot: if the browser's poll
    // already fulfilled this payment, the fresh metadata lets us short-circuit.
    const pi = await stripe().paymentIntents.retrieve(event.data.object.id);
    const result = await fulfillPaymentIntent(pi, new URL(req.url).origin);
    if (result.status === "failed") {
      // Non-2xx makes Stripe retry with backoff, giving Prodigi another chance.
      return NextResponse.json({ received: true, result }, { status: 500 });
    }
    return NextResponse.json({ received: true, result });
  }

  return NextResponse.json({ received: true, ignored: event.type });
}
