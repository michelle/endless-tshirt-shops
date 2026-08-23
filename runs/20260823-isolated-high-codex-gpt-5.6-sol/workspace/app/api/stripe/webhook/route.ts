import { NextResponse } from "next/server";
import { fulfillCheckout } from "@/lib/fulfillment";
import { stripeClient } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 });
  try {
    const event = stripeClient().webhooks.constructEvent(await request.text(), signature, secret);
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      await fulfillCheckout(event.data.object);
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("stripe.webhook_failed", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 400 });
  }
}
