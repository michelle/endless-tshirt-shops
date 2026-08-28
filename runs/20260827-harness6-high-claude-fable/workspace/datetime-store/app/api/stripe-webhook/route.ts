import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getBaseUrl } from "@/lib/base-url";
import { createProdigiOrder, type ProdigiRecipient } from "@/lib/prodigi";
import { isShirtSize, isShirtStyle } from "@/lib/catalog";

export const runtime = "nodejs";

// Stripe calls this endpoint on checkout.session.completed. We then place the
// fulfillment order with Prodigi. Idempotency is handled twice over:
//  - Prodigi's idempotencyKey (the checkout session id) dedupes retried orders
//  - the PaymentIntent's metadata records the Prodigi order id once placed
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripe = getStripe();
  const payload = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (err) {
    console.error("[webhook] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  const sessionId = (event.data.object as Stripe.Checkout.Session).id;

  try {
    // Re-fetch the session so we get a consistent shape regardless of the
    // API version the event was generated with.
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });

    if (session.payment_status !== "paid") {
      console.log(`[webhook] session ${sessionId} not paid, skipping`);
      return NextResponse.json({ received: true, skipped: "unpaid" });
    }

    const pi = session.payment_intent as Stripe.PaymentIntent | null;
    if (pi?.metadata?.prodigi_order_id) {
      console.log(
        `[webhook] session ${sessionId} already fulfilled as ${pi.metadata.prodigi_order_id}`
      );
      return NextResponse.json({ received: true, alreadyFulfilled: true });
    }

    const meta = session.metadata ?? {};
    const style = isShirtStyle(meta.style) ? meta.style : null;
    const size = isShirtSize(meta.size) ? meta.size : null;
    const ts = /^\d{1,17}$/.test(meta.ts ?? "") ? Number(meta.ts) : null;
    if (!style || !size || ts === null) {
      // Not one of our sessions (e.g. a `stripe trigger` fixture) — ack it.
      console.warn(`[webhook] session ${sessionId} missing shirt metadata, skipping`);
      return NextResponse.json({ received: true, skipped: "no-metadata" });
    }

    const shipping =
      session.collected_information?.shipping_details ??
      (session as unknown as { shipping_details?: ShippingDetails })
        .shipping_details ??
      null;
    const addr = shipping?.address ?? session.customer_details?.address ?? null;
    const name =
      shipping?.name ?? session.customer_details?.name ?? "Datetime customer";
    if (!addr?.line1 || !addr.city || !addr.postal_code || !addr.country) {
      console.error(`[webhook] session ${sessionId} has no usable address`);
      // Nothing to retry — a human needs to follow up with the customer.
      return NextResponse.json({ received: true, skipped: "no-address" });
    }

    const recipient: ProdigiRecipient = {
      name,
      email: session.customer_details?.email ?? undefined,
      address: {
        line1: addr.line1,
        line2: addr.line2 ?? undefined,
        townOrCity: addr.city,
        stateOrCounty: addr.state ?? undefined,
        postalOrZipCode: addr.postal_code,
        countryCode: addr.country,
      },
    };

    const artworkUrl = `${getBaseUrl()}/api/artwork?ts=${ts}`;
    const result = await createProdigiOrder({
      idempotencyKey: session.id,
      merchantReference: session.id,
      recipient,
      style,
      size,
      artworkUrl,
      timestampMs: ts,
    });

    const orderId = result.order?.id ?? "unknown";
    console.log(
      `[webhook] session ${sessionId} → Prodigi order ${orderId} (${result.outcome})`
    );

    if (pi?.id) {
      await stripe.paymentIntents.update(pi.id, {
        metadata: {
          prodigi_order_id: orderId,
          prodigi_outcome: result.outcome,
        },
      });
    }

    return NextResponse.json({ received: true, prodigiOrderId: orderId });
  } catch (err) {
    console.error(`[webhook] fulfillment failed for session ${sessionId}`, err);
    // Non-2xx makes Stripe retry with backoff; Prodigi's idempotencyKey keeps
    // retries from double-ordering.
    return NextResponse.json({ error: "Fulfillment failed" }, { status: 500 });
  }
}

interface ShippingDetails {
  name?: string | null;
  address?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country?: string | null;
  } | null;
}
