import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createProdigiOrder } from "@/lib/prodigi";
import { PRODIGI_SKU, colorInfo, isColor, isSize } from "@/lib/product";
import { getSiteOrigin } from "@/lib/site";

export const runtime = "nodejs";

// Stripe requires the exact raw request body to verify signatures, so this
// route reads text() directly rather than json().
export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const signature = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !secret) {
    return NextResponse.json(
      { error: "Webhook not configured." },
      { status: 500 }
    );
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    try {
      await fulfillOrder(stripe, session);
    } catch (err: any) {
      console.error("Fulfillment failed for session", session.id, err);
      // Non-2xx makes Stripe retry the webhook; Prodigi's idempotencyKey
      // (the Checkout Session id) keeps retries from creating duplicate
      // print orders.
      return NextResponse.json({ error: "Fulfillment failed." }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}

async function fulfillOrder(stripe: Stripe, session: Stripe.Checkout.Session) {
  const { stampMs, color, size } = session.metadata ?? {};
  if (!stampMs || !isColor(color) || !isSize(size)) {
    console.error("Session missing/invalid product metadata", session.id);
    return;
  }

  // Stripe has reshuffled where shipping info lives across API versions
  // (top-level `shipping`, then `shipping_details`, now nested under
  // `collected_information.shipping_details`). Check all of them, newest
  // first, falling back to customer_details as a last resort.
  const session_ = session as any;
  const shipping =
    session_.collected_information?.shipping_details ??
    session_.shipping_details ??
    session_.shipping;
  const address = shipping?.address ?? session.customer_details?.address;
  const name =
    shipping?.name || session.customer_details?.name || "Time Traveler";

  if (!address?.line1 || !address?.country) {
    throw new Error("No shipping address on session " + session.id);
  }

  const origin = await getSiteOrigin();
  const info = colorInfo(color);
  const artworkUrl = `${origin}/api/artwork/${stampMs}.png?fg=${encodeURIComponent(
    info.ink
  )}&bg=${encodeURIComponent(info.hex)}`;

  const order = await createProdigiOrder({
    merchantReference: session.id,
    idempotencyKey: session.id,
    sku: PRODIGI_SKU,
    color,
    size,
    artworkUrl,
    recipient: {
      name,
      email: session.customer_details?.email ?? undefined,
      phoneNumber: session.customer_details?.phone ?? undefined,
      address: {
        line1: address.line1,
        line2: address.line2 ?? undefined,
        postalOrZipCode: address.postal_code ?? "",
        countryCode: address.country,
        townOrCity: address.city ?? "",
        stateOrCounty: address.state ?? undefined,
      },
    },
  });

  const prodigiOrderId = order?.order?.id;
  console.log("Prodigi order created", prodigiOrderId, "for session", session.id);

  if (session.payment_intent && prodigiOrderId) {
    try {
      await stripe.paymentIntents.update(session.payment_intent as string, {
        metadata: { prodigi_order_id: prodigiOrderId },
      });
    } catch (err) {
      console.warn("Could not tag payment intent with Prodigi order id", err);
    }
  }
}
