import { NextRequest } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { fulfillCheckoutSession } from "@/lib/fulfill";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Stripe → us. Verifies the signature, then hands paid Checkout Sessions to
 * fulfilment. Returning a non-2xx makes Stripe retry, which is what we want
 * if Prodigi is temporarily unavailable.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");
  if (!secret || !sig) return new Response("Webhook not configured", { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    return new Response(`Bad signature: ${err instanceof Error ? err.message : err}`, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status !== "paid") break; // e.g. delayed payment methods
      if (!session.metadata?.design) {
        // Not a storefront order (e.g. `stripe trigger` fixtures, Payment Links). Acknowledge and ignore.
        console.warn("ignoring checkout session without design metadata", session.id);
        break;
      }
      try {
        await fulfillCheckoutSession(session.id);
      } catch (err) {
        console.error("fulfilment failed", session.id, err);
        return new Response("Fulfilment failed", { status: 500 });
      }
      break;
    }
    default:
      break;
  }
  return Response.json({ received: true });
}
