import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { fulfillCheckoutSession } from "@/lib/fulfillment";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Stripe -> Prodigi bridge. Only a signed, paid checkout.session.completed
 * (or async_payment_succeeded) event can trigger printing.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");
  if (!secret || !sig) return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });

  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(payload, sig, secret);
  } catch (err) {
    return NextResponse.json({ error: `Invalid signature: ${(err as Error).message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status !== "paid") {
      // e.g. delayed payment methods: wait for async_payment_succeeded
      return NextResponse.json({ received: true, fulfillment: "deferred" });
    }
    try {
      const result = await fulfillCheckoutSession(session.id);
      return NextResponse.json({ received: true, fulfillment: result });
    } catch (err) {
      console.error("fulfillment failed", session.id, err);
      // 500 makes Stripe retry; fulfillment is idempotent.
      return NextResponse.json({ error: "fulfillment failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
