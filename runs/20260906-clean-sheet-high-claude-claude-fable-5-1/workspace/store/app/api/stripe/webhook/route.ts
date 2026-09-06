import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { ensureFulfilled } from "@/lib/fulfill";

export const runtime = "nodejs";

/** Stripe -> Prodigi bridge. Registered for checkout.session.completed and checkout.session.async_payment_succeeded. */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET not configured" }, { status: 500 });
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), sig, secret);
  } catch (e) {
    return NextResponse.json({ error: `signature verification failed: ${(e as Error).message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === "paid") {
      try {
        const result = await ensureFulfilled(session.id);
        console.log(`[webhook] ${event.type} ${session.id} -> prodigi ${result.prodigiOrderId} (${result.outcome})`);
      } catch (e) {
        console.error(`[webhook] fulfilment failed for ${session.id}:`, e);
        // 500 makes Stripe retry with backoff; Prodigi's idempotencyKey keeps retries safe.
        return NextResponse.json({ error: (e as Error).message }, { status: 500 });
      }
    }
  }
  return NextResponse.json({ received: true });
}
