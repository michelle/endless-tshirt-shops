import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { getSiteUrl } from "@/lib/site";
import { decodeItemsFromMetadata, artUrlForItem } from "@/lib/orderMeta";
import { createProdigiOrder } from "@/lib/prodigi";
import { PRODIGI_SKU, SHIRT_COLORS } from "@/lib/types";

// This is the only place an order is sent to Prodigi. It only runs once
// Stripe confirms `checkout.session.completed` with a paid session — shirts
// never reach the print queue before money has actually moved.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const rawBody = await req.text();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !secret) {
    console.error("Stripe webhook secret is not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") {
    // e.g. a session completed via an async/delayed payment method that
    // hasn't settled yet — `payment_intent.succeeded` isn't wired up here
    // since Checkout Session metadata (our order data) isn't attached to it.
    return NextResponse.json({ received: true });
  }

  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;

  try {
    await fulfill(session, paymentIntentId);
  } catch (err) {
    console.error("Fulfillment failed for session", session.id, err);
    if (paymentIntentId) {
      await stripe.paymentIntents
        .update(paymentIntentId, { metadata: { prodigi_error: String(err).slice(0, 480) } })
        .catch(() => {});
    }
    // Non-2xx makes Stripe retry the webhook with backoff. Prodigi's
    // idempotency key (the Checkout Session id) guarantees a retry can't
    // create a duplicate print order.
    return NextResponse.json({ error: "Fulfillment failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function fulfill(session: Stripe.Checkout.Session, paymentIntentId?: string | null) {
  const items = decodeItemsFromMetadata(session.metadata);
  if (items.length === 0) {
    throw new Error("No order items found in session metadata");
  }

  const shippingDetails = (session as unknown as { shipping_details?: Stripe.Checkout.Session.ShippingDetails }).shipping_details;
  const legacyShipping = (session as unknown as { shipping?: { address?: Stripe.Address; name?: string } }).shipping;
  const address = shippingDetails?.address ?? legacyShipping?.address ?? session.customer_details?.address;
  const name = shippingDetails?.name ?? legacyShipping?.name ?? session.customer_details?.name;

  if (!address || !name) {
    throw new Error("Missing shipping address on completed session");
  }

  const siteUrl = getSiteUrl();

  const prodigiOrder = await createProdigiOrder({
    merchantReference: session.id,
    idempotencyKey: session.id,
    recipientName: name,
    recipientEmail: session.customer_details?.email ?? undefined,
    address: {
      line1: address.line1 ?? "",
      line2: address.line2 ?? undefined,
      townOrCity: address.city ?? "",
      stateOrCounty: address.state ?? undefined,
      postalOrZipCode: address.postal_code ?? "",
      countryCode: address.country ?? "US",
    },
    items: items.map((item) => ({
      sku: PRODIGI_SKU,
      copies: item.qty,
      sizing: "fitPrintArea",
      attributes: { color: SHIRT_COLORS[item.shirt].prodigiValue, size: item.size },
      assetUrl: artUrlForItem(siteUrl, item),
    })),
  });

  if (paymentIntentId) {
    await stripe.paymentIntents.update(paymentIntentId, {
      metadata: {
        prodigi_order_id: prodigiOrder.id,
        prodigi_status: prodigiOrder.status.stage,
      },
    });
  }
}
