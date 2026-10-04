import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, siteUrl } from "@/lib/stripe";
import { fulfillCheckoutSession } from "@/lib/fulfill";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Stripe → Orbitday. Only a verified `checkout.session.completed` (or the
 * async-payment success event) with payment_status=paid triggers a Prodigi order.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });

  const sig = req.headers.get("stripe-signature");
  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(payload, sig ?? "", secret);
  } catch (e) {
    return NextResponse.json({ error: `Invalid signature: ${(e as Error).message}` }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") {
    // e.g. delayed payment methods: wait for async_payment_succeeded
    return NextResponse.json({ received: true, deferred: session.payment_status });
  }
  if (!session.metadata?.design) {
    // Not one of ours (e.g. `stripe trigger` fixtures) – acknowledge so Stripe stops retrying.
    return NextResponse.json({ received: true, ignored: "no design metadata" });
  }

  try {
    const result = await fulfillCheckoutSession(session.id, siteUrl(req));
    console.log("fulfilled", session.id, result);
    return NextResponse.json({ received: true, ...result });
  } catch (e) {
    console.error("fulfillment failed for", session.id, e);
    // 500 → Stripe retries with backoff; idempotency keys prevent duplicates.
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
