import type Stripe from "stripe";
import { fulfillPaidSession } from "@/lib/fulfillment";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return Response.json({ error: "Webhook is not configured" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return Response.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    try {
      await fulfillPaidSession(session.id, origin);
    } catch (error) {
      console.error("Fulfillment failed", error instanceof Error ? error.message : "Unknown error");
      return Response.json({ error: "Fulfillment will be retried" }, { status: 500 });
    }
  }

  return Response.json({ received: true });
}
