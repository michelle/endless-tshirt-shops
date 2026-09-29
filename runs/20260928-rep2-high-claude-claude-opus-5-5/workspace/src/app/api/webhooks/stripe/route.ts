import type Stripe from "stripe";
import { env } from "@/lib/env";
import { fulfillCheckoutSession } from "@/lib/fulfill";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const payload = await req.text();
  const signature = req.headers.get("stripe-signature");
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(payload, signature ?? "", env.stripeWebhookSecret());
  } catch (e) {
    console.warn("stripe webhook signature failed", (e as Error).message);
    return new Response("Bad signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    try {
      const result = await fulfillCheckoutSession(session.id);
      console.log("fulfillment", session.id, result);
    } catch (e) {
      // Non-2xx makes Stripe retry with backoff for up to 3 days.
      console.error("fulfillment failed", session.id, e);
      return new Response("Fulfillment failed", { status: 500 });
    }
  }
  return Response.json({ received: true });
}
