import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createProdigiOrder } from "@/lib/prodigi";
import { isShirtSize, isShirtStyle } from "@/lib/shirt";

export const runtime = "nodejs";

// Stripe -> Prodigi bridge. On a successful Checkout Session, place the
// matching print order with Prodigi using the shipping address Stripe
// collected and the artwork frozen at the moment of purchase.
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  const payload = await req.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature ?? "", secret);
  } catch (err) {
    console.error("[webhook] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const { style, size, ts, artworkUrl } = session.metadata ?? {};

  if (!isShirtStyle(style) || !isShirtSize(size) || !ts || !artworkUrl) {
    console.error("[webhook] missing/invalid metadata on session", session.id);
    return NextResponse.json({ error: "Missing order metadata" }, { status: 400 });
  }

  const shipping = session.collected_information?.shipping_details ?? session.customer_details;
  const address = shipping?.address;
  if (!shipping?.name || !address?.line1 || !address.postal_code || !address.city || !address.country) {
    console.error("[webhook] missing shipping address on session", session.id);
    return NextResponse.json({ error: "Missing shipping address" }, { status: 400 });
  }

  try {
    const result = await createProdigiOrder({
      merchantReference: session.id,
      recipient: {
        name: shipping.name,
        email: session.customer_details?.email ?? undefined,
        phoneNumber: session.customer_details?.phone ?? undefined,
        address: {
          line1: address.line1,
          line2: address.line2 || undefined,
          postalOrZipCode: address.postal_code,
          countryCode: address.country,
          townOrCity: address.city,
          stateOrCounty: address.state || undefined,
        },
      },
      style,
      size,
      artworkUrl,
    });

    if (!result.ok) {
      console.error("[webhook] Prodigi order failed", session.id, result.raw);
      return NextResponse.json({ error: "Prodigi order failed" }, { status: 502 });
    }

    console.log("[webhook] Prodigi order created", session.id, result.orderId);
    return NextResponse.json({ received: true, prodigiOrderId: result.orderId });
  } catch (err) {
    console.error("[webhook] error creating Prodigi order", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
