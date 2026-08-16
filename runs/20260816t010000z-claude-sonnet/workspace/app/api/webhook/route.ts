import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { ensureFulfilled } from "@/lib/fulfillment";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    if (!signature || !secret) {
      throw new Error("Webhook signature or secret missing.");
    }
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.error("[webhook] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const sessionSummary = event.data.object as Stripe.Checkout.Session;
    const session = await stripe.checkout.sessions.retrieve(sessionSummary.id, {
      expand: ["payment_intent"],
    });
    await ensureFulfilled(session);
  }

  return NextResponse.json({ received: true });
}
