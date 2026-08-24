import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { fulfillCheckoutSession } from "@/lib/fulfill";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const payload = await request.text();

  if (!signature || !secret) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe().webhooks.constructEventAsync(payload, signature, secret);
  } catch (err) {
    console.error("Webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    const origin = new URL(request.url).origin;
    const result = await fulfillCheckoutSession(session, origin);
    if (result.status === "ok") {
      console.log(`[webhook] Prodigi order ${result.prodigiOrderId} created for session ${session.id}`);
    } else {
      console.error(`[webhook] Fulfillment did not complete for session ${session.id}:`, result);
    }
  }

  return NextResponse.json({ received: true });
}
