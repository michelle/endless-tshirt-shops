import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { fulfillCheckoutSession } from "@/lib/fulfill";

/**
 * The payment→print boundary. Stripe calls this after payment succeeds; the
 * signature is verified before anything else happens, and Prodigi is only
 * touched once the session (retrieved live, not from the event payload)
 * reports payment_status=paid.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  let event: Stripe.Event;
  const raw = await req.text();
  try {
    event = stripe().webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    console.error("webhook signature verification failed:", err);
    return NextResponse.json({ error: "Bad signature." }, { status: 400 });
  }

  try {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const fromEvent = event.data.object as Stripe.Checkout.Session;
      // Trust the API, not the payload: re-read the session's live state.
      const session = await stripe().checkout.sessions.retrieve(fromEvent.id);
      if (session.payment_status === "paid") {
        const result = await fulfillCheckoutSession(session);
        console.log(
          `fulfilled session ${session.id}: prodigi ${result.orderId} (${result.outcome})`
        );
      } else {
        console.log(`session ${session.id} completed but not paid (${session.payment_status}); skipping`);
      }
    }
    // Unhandled event types are acknowledged so Stripe stops retrying them.
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error(`webhook ${event.type} handling failed:`, err);
    // 500 makes Stripe retry with backoff; fulfillment is idempotent.
    return NextResponse.json({ error: "Handler failed." }, { status: 500 });
  }
}
