import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { fulfillCheckoutSession } from "@/lib/fulfill";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Stripe → us. Verifies the signature, then hands paid sessions to Prodigi.
 * Returning non-2xx makes Stripe retry, which is what we want if Prodigi is down.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, sig, secret);
  } catch (e) {
    return NextResponse.json({ error: `Signature verification failed: ${(e as Error).message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.metadata?.app !== "heartwood") return NextResponse.json({ received: true, ignored: "not ours" });
    try {
      const result = await fulfillCheckoutSession(session.id);
      if (result.status === "error") {
        console.error("fulfil error", session.id, result.message);
        // Metadata problems won't fix themselves on retry; acknowledge so Stripe stops retrying.
        return NextResponse.json({ received: true, result });
      }
      return NextResponse.json({ received: true, result });
    } catch (e) {
      console.error("fulfil exception", session.id, e);
      return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
