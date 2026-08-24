import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { webhookSecret } from "@/lib/env";
import { fulfillCheckoutSession } from "@/lib/prodigi";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, signature, webhookSecret());
  } catch (error) {
    console.warn("Rejected Stripe webhook", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === "paid") {
      try {
        await fulfillCheckoutSession(session.id, request.nextUrl.origin);
      } catch (error) {
        // Returning 500 asks Stripe to retry. Prodigi's idempotency key prevents duplicate orders.
        console.error("Paid checkout fulfillment failed", { sessionId: session.id, error });
        return NextResponse.json({ error: "Fulfillment failed" }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}
