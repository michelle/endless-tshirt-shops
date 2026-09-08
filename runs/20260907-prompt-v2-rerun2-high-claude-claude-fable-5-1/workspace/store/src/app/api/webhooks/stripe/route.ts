import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { fulfilSession, NotOurSessionError, retrieveSession } from "@/lib/fulfil";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook secret not configured" }, { status: 503 });

  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, sig || "", secret);
  } catch (e) {
    return NextResponse.json({ error: `Invalid signature: ${e instanceof Error ? e.message : e}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === "paid") {
      try {
        // Re-fetch with the expanded shipping rate so we know Standard vs Express.
        const full = await retrieveSession(session.id);
        const { outcome, order } = await fulfilSession(full);
        console.log(`fulfilled ${session.id} -> prodigi ${order.id} (${outcome})`);
      } catch (e) {
        if (e instanceof NotOurSessionError) {
          console.warn(e.message);
          return NextResponse.json({ received: true, ignored: true });
        }
        console.error(`fulfilment failed for ${session.id}`, e);
        // Return 500 so Stripe retries the webhook.
        return NextResponse.json({ error: "fulfilment failed" }, { status: 500 });
      }
    }
  }
  return NextResponse.json({ received: true });
}
