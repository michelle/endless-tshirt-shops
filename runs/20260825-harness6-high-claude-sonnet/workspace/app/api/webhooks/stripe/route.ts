import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createProdigiOrder } from "@/lib/prodigi";
import {
  isShirtSize,
  isShirtStyle,
  prodigiSize,
  SHIRT_STYLES,
} from "@/lib/products";

export const runtime = "nodejs";

// Stripe requires the raw request body to verify the webhook signature, so
// this route must not run through any JSON body-parsing middleware.
async function fulfillCheckoutSession(
  session: Stripe.Checkout.Session,
  origin: string,
) {
  const stripe = getStripe();
  const full = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ["customer_details"],
  });

  const meta = full.metadata || {};
  const style = meta.style;
  const size = meta.size;
  const date = meta.date;
  const time = meta.time;
  const tz = meta.tz || "UTC";

  if (!isShirtStyle(style) || !isShirtSize(size) || !date || !time) {
    console.error("[webhook] session missing expected metadata", full.id, meta);
    return;
  }

  const address =
    full.shipping_details?.address ?? full.customer_details?.address;
  const recipientName =
    full.shipping_details?.name ?? full.customer_details?.name ?? "Customer";

  if (!address || !address.line1 || !address.city || !address.country) {
    console.error("[webhook] session missing shipping address", full.id);
    return;
  }

  const product = SHIRT_STYLES[style];
  const base = process.env.PUBLIC_BASE_URL || origin;
  const artworkUrl = `${base}/api/artwork?date=${encodeURIComponent(
    date,
  )}&time=${encodeURIComponent(time)}&tz=${encodeURIComponent(tz)}`;

  const result = await createProdigiOrder({
    merchantReference: full.id,
    idempotencyKey: full.id,
    recipientName,
    recipientEmail: full.customer_details?.email ?? undefined,
    address: {
      line1: address.line1,
      line2: address.line2,
      townOrCity: address.city,
      postalOrZipCode: address.postal_code ?? "",
      countryCode: address.country,
      stateOrCounty: address.state,
    },
    sku: product.prodigiSku,
    color: product.prodigiColor,
    size: prodigiSize(size),
    artworkUrl,
  });

  console.log(
    `[webhook] Prodigi order ${result.outcome} for session ${full.id}: ${result.orderId}`,
  );

  // Stash the fulfillment order id on the PaymentIntent so the success page
  // (or support tooling) can look it up later without a database.
  if (typeof full.payment_intent === "string" && result.orderId) {
    await stripe.paymentIntents.update(full.payment_intent, {
      metadata: { prodigiOrderId: result.orderId, prodigiOutcome: result.outcome },
    });
  }
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const rawBody = await req.text();

  if (!signature || !secret) {
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 400 },
    );
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.error("[webhook] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status === "paid") {
        await fulfillCheckoutSession(session, req.nextUrl.origin);
      }
    }
  } catch (err) {
    console.error("[webhook] fulfillment error", err);
    // Return 500 so Stripe retries delivery.
    return NextResponse.json({ error: "Fulfillment failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
