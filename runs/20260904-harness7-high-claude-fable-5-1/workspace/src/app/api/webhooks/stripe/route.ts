import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { fulfillPaymentIntentObject } from "@/lib/fulfillment";
import { requireEnv } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Stripe webhook: the authoritative trigger for fulfilment. Even if the
 * customer closes the tab the instant payment succeeds, this places the order.
 */
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }
  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(payload, signature, requireEnv("STRIPE_WEBHOOK_SECRET"));
  } catch (err) {
    console.warn("[webhook] signature verification failed", err);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const pi = event.data.object;
      // Only our shirts (defensive: other products could share the account).
      if (!pi.metadata?.timestamp) break;
      const result = await fulfillPaymentIntentObject(pi);
      if (result.status === "failed") {
        // Non-2xx makes Stripe retry with backoff, giving Prodigi outages a second chance.
        return NextResponse.json({ received: true, result }, { status: 500 });
      }
      return NextResponse.json({ received: true, result });
    }
    default:
      break;
  }
  return NextResponse.json({ received: true });
}
