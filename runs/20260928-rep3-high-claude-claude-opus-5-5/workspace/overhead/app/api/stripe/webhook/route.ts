import type Stripe from "stripe";
import { env } from "@/lib/server/env";
import { fulfillCheckoutSession } from "@/lib/server/fulfill";
import { stripe } from "@/lib/server/stripe";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const payload = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(payload, signature, env.stripeWebhookSecret());
  } catch (e) {
    console.warn("[webhook] bad signature", (e as Error).message);
    return new Response("Invalid signature", { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      try {
        const r = await fulfillCheckoutSession(session.id);
        return Response.json({ received: true, ...r });
      } catch (e) {
        // Non-2xx makes Stripe retry with backoff (for up to 3 days).
        console.error("[webhook] fulfilment failed", session.id, e);
        return new Response("Fulfilment failed", { status: 500 });
      }
    }
    case "checkout.session.async_payment_failed":
      console.warn("[webhook] async payment failed", (event.data.object as Stripe.Checkout.Session).id);
      break;
  }
  return Response.json({ received: true });
}
