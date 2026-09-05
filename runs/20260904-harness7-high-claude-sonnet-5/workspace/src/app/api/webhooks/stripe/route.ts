import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createProdigiOrder } from "@/lib/prodigi";
import {
  PRODIGI_COLOR,
  SIZES,
  STYLES,
  isSizeId,
  isStyleId,
} from "@/lib/products";

export const runtime = "nodejs";

async function fulfillCheckout(session: Stripe.Checkout.Session, origin: string) {
  const style = session.metadata?.style;
  const size = session.metadata?.size;
  const ts = session.metadata?.ts;

  if (!isStyleId(style) || !isSizeId(size) || !ts) {
    throw new Error(
      `Checkout session ${session.id} is missing valid product metadata`,
    );
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;

  // Idempotency guard: if we've already recorded a Prodigi order on this
  // PaymentIntent, don't place a second one on webhook retry/redelivery.
  if (paymentIntentId) {
    const existing = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (existing.metadata?.prodigi_order_id) {
      return existing.metadata.prodigi_order_id;
    }
  }

  const shippingDetails = session.collected_information?.shipping_details;
  const address = shippingDetails?.address ?? session.customer_details?.address;
  const recipientName =
    shippingDetails?.name ?? session.customer_details?.name ?? "Customer";
  const recipientEmail = session.customer_details?.email ?? "";

  if (!address?.line1 || !address.city || !address.postal_code || !address.country) {
    throw new Error(
      `Checkout session ${session.id} is missing a complete shipping address`,
    );
  }

  const artworkUrl = `${origin}/api/artwork?ts=${ts}&style=${style}`;

  const order = await createProdigiOrder({
    merchantReference: session.id,
    recipientName,
    recipientEmail,
    address: {
      line1: address.line1,
      line2: address.line2,
      townOrCity: address.city,
      stateOrCounty: address.state,
      postalOrZipCode: address.postal_code,
      countryCode: address.country,
    },
    sku: STYLES[style].prodigiSku,
    color: PRODIGI_COLOR,
    size: SIZES[size].prodigiSize,
    artworkUrl,
  });

  if (paymentIntentId) {
    await stripe.paymentIntents.update(paymentIntentId, {
      metadata: {
        prodigi_order_id: order.orderId ?? "",
        prodigi_status: order.status ?? order.outcome,
      },
    });
  }

  return order.orderId;
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    if (!signature) throw new Error("Missing stripe-signature header");
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status === "paid") {
        const origin = new URL(request.url).origin;
        const orderId = await fulfillCheckout(session, origin);
        console.log(`Fulfilled session ${session.id} -> Prodigi order ${orderId}`);
      }
    }
  } catch (err) {
    console.error("Fulfillment error", err);
    // Return 500 so Stripe retries the webhook with backoff — most failures
    // here (Prodigi hiccup, transient network error) are worth retrying.
    return NextResponse.json({ error: "Fulfillment failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
