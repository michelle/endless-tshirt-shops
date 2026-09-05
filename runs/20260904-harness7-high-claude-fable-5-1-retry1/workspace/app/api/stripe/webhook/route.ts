import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { ensureFulfilled } from "@/lib/fulfill";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/stripe/webhook — `payment_intent.succeeded` triggers Prodigi fulfillment.
 * This is the authoritative path; the client-side POST /api/orders/{id} is just a fast path.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), sig, secret);
  } catch (err) {
    console.warn("[webhook] bad signature", String(err));
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object;
    if (pi.metadata?.store === "datetime.store") {
      // Re-fetch to avoid acting on a stale snapshot (the client path may have already fulfilled).
      const fresh = await stripe().paymentIntents.retrieve(pi.id);
      await ensureFulfilled(fresh);
    }
  }
  return NextResponse.json({ received: true });
}
