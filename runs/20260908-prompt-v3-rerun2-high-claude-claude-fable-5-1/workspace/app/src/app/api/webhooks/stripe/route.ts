import { NextRequest } from "next/server";
import type Stripe from "stripe";
import { fulfilSession } from "@/lib/fulfil";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Stripe webhook. The ONLY place that sends orders to the printer, and only
 * once Stripe reports the session as paid. Returning a 5xx makes Stripe retry.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");
  if (!secret) return new Response("Webhook not configured", { status: 500 });
  if (!sig) return new Response("Missing stripe-signature header", { status: 400 });

  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(payload, sig, secret);
  } catch (e) {
    console.warn("webhook signature failed", e);
    return new Response("Bad signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status !== "paid") {
      console.log(`session ${session.id} completed but payment_status=${session.payment_status}; waiting`);
      return Response.json({ received: true, fulfilled: false });
    }
    try {
      const result = await fulfilSession(session.id);
      return Response.json({ received: true, ...result });
    } catch (e) {
      console.error(`fulfilment failed for ${session.id}`, e);
      return new Response("Fulfilment failed; will retry", { status: 500 });
    }
  }

  return Response.json({ received: true });
}
