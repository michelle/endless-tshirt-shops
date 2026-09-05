import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { fulfil } from "@/lib/fulfill";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Payment succeeds here; shirts start existing here. */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET is not set — refusing unverified events");
    return NextResponse.json({ error: "webhook not configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "missing signature" }, { status: 400 });

  const raw = await request.text();

  let event: Stripe.Event;
  try {
    event = await stripe().webhooks.constructEventAsync(raw, signature, secret);
  } catch (error) {
    console.error("[webhook] signature check failed", error);
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  if (event.type !== "payment_intent.succeeded") {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  const intent = event.data.object as Stripe.PaymentIntent;
  try {
    const result = await fulfil(stripe(), intent);
    console.log("[webhook]", intent.id, JSON.stringify(result));
    return NextResponse.json({ received: true, ...result });
  } catch (error) {
    // A 500 asks Stripe to retry, which is exactly what we want for a
    // transient printer-side failure.
    console.error("[webhook] fulfilment failed for", intent.id, error);
    return NextResponse.json(
      { error: "fulfilment failed", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
