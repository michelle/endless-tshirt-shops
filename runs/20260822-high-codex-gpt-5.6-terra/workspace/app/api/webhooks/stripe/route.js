import Stripe from "stripe";
import { fulfillCheckoutSession } from "../../../../lib/checkout-fulfillment";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
      return Response.json({ error: "Stripe webhook is not configured." }, { status: 503 });
    }
    const signature = request.headers.get("stripe-signature");
    if (!signature) return Response.json({ error: "Missing Stripe signature." }, { status: 400 });
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const event = stripe.webhooks.constructEvent(await request.text(), signature, process.env.STRIPE_WEBHOOK_SECRET);
    if (event.type === "checkout.session.completed") {
      await fulfillCheckoutSession(event.data.object.id);
    }
    return Response.json({ received: true });
  } catch (error) {
    console.error("stripe webhook", error);
    // A non-2xx response asks Stripe to retry transient fulfillment failures.
    return Response.json({ error: error.message || "Webhook processing failed." }, { status: error.status || 500 });
  }
}
