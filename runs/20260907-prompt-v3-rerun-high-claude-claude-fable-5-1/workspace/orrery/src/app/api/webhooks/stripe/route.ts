import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { ensureFulfilled } from "@/lib/fulfil";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Stripe → us. On a paid Checkout Session we place the Prodigi order.
 * Returning non-2xx makes Stripe retry, which is what we want if Prodigi is down.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET not configured" }, { status: 500 });
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "missing signature" }, { status: 400 });
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, sig, secret);
  } catch (e) {
    return NextResponse.json({ error: `signature verification failed: ${e instanceof Error ? e.message : e}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status !== "paid") {
      return NextResponse.json({ received: true, skipped: "not paid yet" });
    }
    try {
      const view = await ensureFulfilled(session.id);
      return NextResponse.json({ received: true, prodigiOrderId: view.fulfilment?.prodigiOrderId ?? null });
    } catch (e) {
      console.error("fulfilment failed for", session.id, e);
      return NextResponse.json({ error: e instanceof Error ? e.message : "fulfilment failed" }, { status: 500 });
    }
  }
  return NextResponse.json({ received: true });
}
