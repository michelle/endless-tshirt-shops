import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { getBaseUrl } from "@/lib/site";
import {
  GARMENT_COLOR,
  isShirtSize,
  isShirtStyle,
  prodigiSizeAttribute,
  styleDef,
} from "@/lib/products";
import { createProdigiOrder, ProdigiError } from "@/lib/prodigi";

// This is the source of truth for fulfillment: once Stripe confirms a
// charge, we place the matching print order with Prodigi.
//
// Stripe delivers webhooks at least once — if our handler is slow (a cold
// start plus two outbound API calls can exceed Stripe's delivery timeout),
// it will redeliver the *same* event and we must not place a second order.
// The event payload itself (`event.data.object`) is a frozen snapshot from
// the moment the event was created, so it never reflects metadata we wrote
// on a previous delivery — we re-fetch the PaymentIntent fresh and use that
// as the idempotency guard instead. We also write a short-lived "claim"
// before calling Prodigi, so two near-simultaneous deliveries don't both
// slip past the check while the first Prodigi call is still in flight.
// (This is a best-effort lock via Stripe metadata, not a real distributed
// lock — see README for the caveat.)
export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const payload = await req.text();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;
  try {
    if (!secret || !signature) throw new Error("Webhook secret not configured");
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "invalid signature";
    console.error("[stripe webhook] signature verification failed:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type !== "payment_intent.succeeded") {
    return NextResponse.json({ received: true });
  }

  const piId = (event.data.object as Stripe.PaymentIntent).id;
  const pi = await stripe.paymentIntents.retrieve(piId);

  if (pi.metadata?.prodigiOrderId) {
    // Already fulfilled — this is a redelivery.
    return NextResponse.json({ received: true, alreadyFulfilled: true });
  }
  const claimedAt = Number(pi.metadata?.prodigiClaimedAt ?? 0);
  if (claimedAt && Date.now() - claimedAt < 60_000) {
    // Another (near-simultaneous) delivery is already placing this order.
    return NextResponse.json({ received: true, claimedByAnotherDelivery: true });
  }
  await stripe.paymentIntents.update(pi.id, {
    metadata: { prodigiClaimedAt: String(Date.now()) },
  });

  const { style, size, timestamp } = pi.metadata ?? {};
  if (!isShirtStyle(style) || !isShirtSize(size) || !timestamp) {
    console.error("[stripe webhook] payment_intent missing shirt metadata", pi.id);
    return NextResponse.json({ error: "missing shirt metadata" }, { status: 400 });
  }

  const shipping = pi.shipping;
  if (!shipping?.address?.line1 || !shipping.address.city || !shipping.address.postal_code || !shipping.address.country) {
    console.error("[stripe webhook] payment_intent missing shipping address", pi.id);
    return NextResponse.json({ error: "missing shipping address" }, { status: 400 });
  }

  const baseUrl = getBaseUrl();
  const artworkUrl = `${baseUrl}/api/artwork?ts=${encodeURIComponent(timestamp)}`;

  try {
    const order = await createProdigiOrder({
      merchantReference: pi.id,
      shippingMethod: "Standard",
      callbackUrl: `${baseUrl}/api/webhooks/prodigi`,
      recipient: {
        name: shipping.name ?? "Customer",
        email: pi.receipt_email ?? undefined,
        address: {
          line1: shipping.address.line1,
          line2: shipping.address.line2 ?? undefined,
          townOrCity: shipping.address.city,
          stateOrCounty: shipping.address.state ?? undefined,
          postalOrZipCode: shipping.address.postal_code,
          countryCode: shipping.address.country,
        },
      },
      items: [
        {
          sku: styleDef(style).sku,
          copies: 1,
          sizing: "fitPrintArea",
          attributes: {
            color: GARMENT_COLOR,
            size: prodigiSizeAttribute(size),
          },
          assets: [{ printArea: "front", url: artworkUrl }],
        },
      ],
    });

    await stripe.paymentIntents.update(pi.id, {
      metadata: {
        prodigiOrderId: order.id,
        prodigiStage: order.status?.stage ?? "InProgress",
        prodigiClaimedAt: "",
      },
    });

    console.log(`[stripe webhook] created Prodigi order ${order.id} for ${pi.id}`);
    return NextResponse.json({ received: true, prodigiOrderId: order.id });
  } catch (err) {
    const message =
      err instanceof ProdigiError
        ? err.message
        : err instanceof Error
        ? err.message
        : "Unknown Prodigi error";
    console.error("[stripe webhook] failed to create Prodigi order:", message);

    await stripe.paymentIntents
      .update(pi.id, {
        metadata: { prodigiError: message.slice(0, 480), prodigiClaimedAt: "" },
      })
      .catch(() => {});

    // Non-2xx makes Stripe retry the webhook with backoff, which is what we
    // want for a transient Prodigi outage.
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
