import type Stripe from "stripe";
import { fulfill } from "@/lib/fulfill";
import { baseUrl } from "@/lib/site";
import { stripe } from "@/lib/stripe";

export const maxDuration = 60;

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook secret not configured", { status: 500 });
  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(payload, req.headers.get("stripe-signature") || "", secret);
  } catch (e: any) {
    return new Response(`Bad signature: ${e.message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === "paid") {
      try {
        await fulfill(session.id, baseUrl(req));
      } catch (e) {
        console.error("[webhook] fulfil failed", session.id, e);
        // non-2xx → Stripe retries with backoff
        return new Response("Fulfilment failed", { status: 500 });
      }
    }
  }
  return Response.json({ received: true });
}
