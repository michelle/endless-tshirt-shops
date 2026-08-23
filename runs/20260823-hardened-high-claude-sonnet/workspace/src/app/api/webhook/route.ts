import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { renderArtworkPng } from "@/lib/artwork";
import { createDesign, createQuote, placeOrder } from "@/lib/scalablePress";
import {
  GARMENT_COLOR,
  SIZE_TO_SCALABLE_PRESS,
  STYLES,
  isShirtSize,
  isShirtStyle,
} from "@/lib/product";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    return NextResponse.json(
      { error: `Invalid signature: ${(err as Error).message}` },
      { status: 400 }
    );
  }

  if (event.type === "payment_intent.succeeded") {
    await fulfillOrder(event.data.object as Stripe.PaymentIntent);
  }

  return NextResponse.json({ received: true });
}

async function fulfillOrder(pi: Stripe.PaymentIntent) {
  // Stripe may retry webhook delivery; skip if we've already placed the order.
  if (pi.metadata.fulfillment_status === "ordered") return;

  const { style, size, momentISO } = pi.metadata;
  if (!isShirtStyle(style) || !isShirtSize(size) || !momentISO) {
    await stripe().paymentIntents.update(pi.id, {
      metadata: {
        ...pi.metadata,
        fulfillment_status: "error",
        fulfillment_error: "Invalid or missing order metadata on PaymentIntent",
      },
    });
    return;
  }

  try {
    const shippingAddress = pi.shipping?.address;
    if (!pi.shipping || !shippingAddress) {
      throw new Error("Missing shipping address on PaymentIntent");
    }

    const png = renderArtworkPng(new Date(momentISO), style);
    const design = await createDesign(png);

    const quote = await createQuote({
      designId: design.designId,
      productId: STYLES[style].scalablePressProductId,
      color: GARMENT_COLOR,
      size: SIZE_TO_SCALABLE_PRESS[size],
      address: {
        name: pi.shipping.name || "",
        address1: shippingAddress.line1 || "",
        address2: shippingAddress.line2 || undefined,
        city: shippingAddress.city || "",
        state: shippingAddress.state || "",
        zip: shippingAddress.postal_code || "",
        email: pi.receipt_email || undefined,
      },
    });

    const order = await placeOrder(quote.orderToken);

    await stripe().paymentIntents.update(pi.id, {
      metadata: {
        ...pi.metadata,
        fulfillment_status: "ordered",
        sp_order_id: order.orderId,
        sp_mode: order.mode,
      },
    });
  } catch (err) {
    await stripe().paymentIntents.update(pi.id, {
      metadata: {
        ...pi.metadata,
        fulfillment_status: "error",
        fulfillment_error: String((err as Error).message).slice(0, 480),
      },
    });
  }
}
