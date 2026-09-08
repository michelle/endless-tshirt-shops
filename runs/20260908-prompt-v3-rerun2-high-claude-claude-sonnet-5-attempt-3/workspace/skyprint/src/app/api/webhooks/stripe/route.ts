import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripeServer";
import { parseMetadata } from "@/lib/orderData";
import { createProdigiOrder } from "@/lib/prodigi";

// This is the ONLY place that ever talks to Prodigi. Shirts are sent to
// print exclusively from here, triggered by Stripe's server-to-server
// `payment_intent.succeeded` webhook -- never from the client, so a customer
// closing their browser after paying (or never getting a client-side
// "success" callback) can't skip fulfillment, and nothing gets printed
// without a confirmed successful charge.

function baseUrl(req: NextRequest): string {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL;
  const host = req.headers.get("host");
  return `https://${host}`;
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  const rawBody = await req.text();
  const stripe = getStripe();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig ?? "", secret);
  } catch (err) {
    return NextResponse.json(
      { error: `Signature verification failed: ${(err as Error).message}` },
      { status: 400 }
    );
  }

  if (event.type !== "payment_intent.succeeded") {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  const piId = event.data.object.id;

  // Re-fetch fresh: the event payload is a frozen snapshot from creation
  // time and never reflects metadata written by a previous delivery of
  // this same webhook, so it can't be used as the idempotency guard.
  const intent = await stripe.paymentIntents.retrieve(piId);
  const order = parseMetadata(intent.metadata);

  if (!order) {
    return NextResponse.json({ error: "Missing order metadata" }, { status: 400 });
  }

  if (order.fulfillmentStatus === "submitted" || order.fulfillmentStatus === "processing") {
    // Already handled (or currently being handled) by an earlier delivery
    // of this webhook -- Stripe redelivers, Prodigi has no idempotency.
    return NextResponse.json({ received: true, status: order.fulfillmentStatus });
  }

  // Claim it before calling Prodigi to shrink the race window on redelivery.
  await stripe.paymentIntents.update(piId, {
    metadata: { fulfillment_status: "processing" },
  });

  try {
    const printFileUrl = `${baseUrl(req)}/api/print-file/${piId}`;
    const result = await createProdigiOrder(order, printFileUrl, piId);

    await stripe.paymentIntents.update(piId, {
      metadata: {
        fulfillment_status: "submitted",
        prodigi_order_id: result.orderId ?? "",
      },
    });

    return NextResponse.json({ received: true, prodigiOrderId: result.orderId });
  } catch (err) {
    const message = (err as Error).message.slice(0, 400);
    await stripe.paymentIntents.update(piId, {
      metadata: { fulfillment_status: "failed", fulfillment_error: message },
    });
    // 500 so Stripe retries with backoff; the "processing" claim above at
    // least keeps concurrent redeliveries from double-submitting.
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
