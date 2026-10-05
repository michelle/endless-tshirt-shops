import { NextResponse, after } from "next/server";
import type Stripe from "stripe";
import { stripe, stripeConfigured } from "@/lib/stripe";
import { ensureFulfilled } from "@/lib/fulfill";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Stripe -> Prodigi bridge. Register for checkout.session.completed and
 * checkout.session.async_payment_succeeded. Fulfilment is idempotent, so
 * Stripe's at-least-once delivery and manual retries are both safe.
 */
export async function POST(request: Request) {
  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET is not configured." }, { status: 500 });
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch (error) {
    return NextResponse.json({ error: `signature verification failed: ${(error as Error).message}` }, { status: 400 });
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === "paid") {
      // Acknowledge Stripe immediately. Placing a Prodigi order can take several
      // seconds and Stripe treats a slow response as a failed delivery, so the
      // work runs after the response. Fulfilment is idempotent on the session
      // id, and the confirmation page is a second trigger if this never runs.
      after(async () => {
        try {
          const result = await ensureFulfilled(session.id);
          console.log(`[webhook] ${event.type} ${session.id} -> prodigi ${result.prodigiOrderId} (${result.outcome})`);
        } catch (error) {
          console.error(`[webhook] fulfilment failed for ${session.id}`, error);
        }
      });
    }
  }
  return NextResponse.json({ received: true });
}
