import { NextRequest } from "next/server";
import { fulfilStripeSession } from "@/lib/stripeFulfil";
import { stripe, stripeEnabled, webhookSecret } from "@/lib/stripe";

export const runtime = "nodejs";
export const maxDuration = 60;

const FULFIL_ON = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
]);

export async function POST(req: NextRequest) {
  if (!stripeEnabled() || !webhookSecret()) {
    return new Response("Stripe is not configured on this deployment", { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing stripe-signature", { status: 400 });

  const raw = await req.text();
  let event;
  try {
    event = stripe().webhooks.constructEvent(raw, signature, webhookSecret());
  } catch (err: any) {
    return new Response(`Signature verification failed: ${err.message}`, { status: 400 });
  }

  if (!FULFIL_ON.has(event.type)) return Response.json({ received: true, ignored: event.type });

  const session = event.data.object as any;
  try {
    const result = await fulfilStripeSession(session.id);
    if (result.status !== "paid") {
      // Nothing to print (yet). 200 so Stripe stops retrying a terminal state.
      return Response.json({ received: true, skipped: result.reason });
    }
    return Response.json({
      received: true,
      ref: result.ref,
      prodigiOrderId: result.order.id,
      deduplicated: result.alreadyExisted,
    });
  } catch (err: any) {
    // 500 makes Stripe retry, which is what we want for a transient Prodigi error.
    console.error("fulfilment failed", event.id, err);
    return new Response(`Fulfilment failed: ${err.message}`, { status: 500 });
  }
}
