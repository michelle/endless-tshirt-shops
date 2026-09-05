import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { FulfillmentError, fulfillPaymentIntent } from "@/lib/fulfillment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/stripe
 * Server-to-server fulfilment: when a PaymentIntent succeeds, place the Prodigi
 * order. This covers customers who close the tab before the browser-side
 * finalize call runs, and redirect-based payment methods.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "webhook not configured" }, { status: 500 });
  }
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), signature, secret);
  } catch (err) {
    console.warn("[webhook] signature verification failed", err);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const pi = event.data.object;
      try {
        // Re-fetch so we see metadata written by a concurrent finalize call.
        const fresh = await stripe().paymentIntents.retrieve(pi.id);
        const result = await fulfillPaymentIntent(fresh);
        console.log(`[webhook] ${pi.id} -> prodigi ${result.prodigiOrderId} (${result.outcome})`);
      } catch (err) {
        console.error(`[webhook] fulfilment failed for ${pi.id}`, err);
        // Ask Stripe to retry unless the failure is permanent (bad data).
        const permanent = err instanceof FulfillmentError && err.status === 422;
        if (!permanent) return NextResponse.json({ error: "fulfilment failed, retry" }, { status: 500 });
      }
      break;
    }
    case "payment_intent.payment_failed": {
      const pi = event.data.object;
      console.warn(`[webhook] payment failed for ${pi.id}: ${pi.last_payment_error?.message ?? "unknown"}`);
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
