import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { fulfillCheckoutSession } from "@/lib/fulfillment";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return NextResponse.json({ error: "Webhook is not configured." }, { status: 400 });
  try {
    const event = getStripe().webhooks.constructEvent(await request.text(), signature, secret);
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      await fulfillCheckoutSession(event.data.object.id);
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("stripe_webhook_error", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 400 });
  }
}
