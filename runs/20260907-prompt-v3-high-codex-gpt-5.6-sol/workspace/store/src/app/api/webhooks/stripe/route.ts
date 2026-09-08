import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { openOrder } from "@/lib/order";
import { sendPaidOrderToProdigi } from "@/lib/prodigi";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeSecret || !webhookSecret) return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 });

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const stripe = new Stripe(stripeSecret);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, webhookSecret);
  } catch (error) {
    console.error("Stripe signature verification failed", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status !== "paid") return NextResponse.json({ received: true });
    try {
      const encryptedOrder = session.metadata?.order_payload;
      if (!encryptedOrder) throw new Error("Paid Stripe session has no order payload");
      const prodigiOrderId = await sendPaidOrderToProdigi(session, openOrder(encryptedOrder));
      await stripe.checkout.sessions.update(session.id, { metadata: { ...session.metadata, prodigi_order_id: prodigiOrderId, fulfilled_at: new Date().toISOString() } });
    } catch (error) {
      console.error("Paid order fulfillment failed", { sessionId: session.id, error });
      return NextResponse.json({ error: "Fulfillment failed; retry requested" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
