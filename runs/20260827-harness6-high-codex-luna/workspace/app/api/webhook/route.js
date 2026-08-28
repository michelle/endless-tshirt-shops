import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createProdigiOrder } from "../../../lib/prodigi";

export const runtime = "nodejs";

export async function POST(request) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  let event;
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    event = process.env.STRIPE_WEBHOOK_SECRET
      ? stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET)
      : JSON.parse(rawBody);
  } catch (error) {
    console.error("webhook_verification_error", error.message);
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }
  if (event.type === "checkout.session.completed") {
    try {
      const session = event.data.object;
      if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") return NextResponse.json({ received: true });
      const order = await createProdigiOrder(session);
      console.info("prodigi_order_created", { stripeSession: session.id, prodigiOrder: order?.id });
    } catch (error) {
      console.error("prodigi_order_error", error);
      return NextResponse.json({ error: "Fulfillment handoff failed" }, { status: 502 });
    }
  }
  return NextResponse.json({ received: true });
}
