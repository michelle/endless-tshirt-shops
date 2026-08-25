import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createProdigiOrder } from "../../../../lib/prodigi";
import { getStripe } from "../../../../lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return NextResponse.json({ error: "Webhook is not configured." }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch (error) {
    console.error("Stripe webhook signature verification failed", error);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === "paid" || session.payment_status === "no_payment_required") {
      try {
        const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/$/, "");
        const order = await createProdigiOrder(session, siteUrl);
        try {
          await getStripe().checkout.sessions.update(session.id, {
            metadata: { ...session.metadata, prodigi_order_id: order.id, prodigi_stage: order.stage || "submitted" }
          });
        } catch (metadataError) {
          console.error("Prodigi order was created but Stripe metadata update failed", metadataError);
        }
        console.info("Prodigi order created", { checkoutSessionId: session.id, prodigiOrderId: order.id, stage: order.stage });
      } catch (error) {
        console.error("Stripe payment succeeded but Prodigi fulfillment failed", error);
        return NextResponse.json({ error: "Fulfillment failed; Stripe will retry." }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}
