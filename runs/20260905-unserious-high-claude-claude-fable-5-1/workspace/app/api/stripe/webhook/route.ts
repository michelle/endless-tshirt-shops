import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { fulfillPaymentIntent } from "@/lib/fulfill";

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
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const raw = await req.text();
    event = stripe().webhooks.constructEvent(raw, signature, secret);
  } catch (err) {
    console.error("[webhook] bad signature:", err);
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object;
    const result = await fulfillPaymentIntent(pi.id);
    console.log(`[webhook] ${event.id} ${pi.id} -> ${result.state}`);
    if (result.state === "failed") {
      // Tell Stripe to retry; Prodigi's idempotency key keeps this safe.
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
