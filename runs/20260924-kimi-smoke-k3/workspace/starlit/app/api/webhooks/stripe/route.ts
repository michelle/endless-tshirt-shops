// Stripe webhook: the ONLY path that turns a Stripe payment into a
// Prodigi order. Fulfills on `checkout.session.completed`, after
// signature verification and metadata HMAC validation.

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { fromMetadata, type ShippingAddress } from "@/lib/order";
import { fulfillOrder } from "@/lib/fulfill";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const key = process.env.STRIPE_SECRET_KEY;
  const whsec = process.env.STRIPE_WEBHOOK_SECRET;
  if (!key || !whsec) {
    return NextResponse.json({ error: "stripe not configured" }, { status: 503 });
  }
  const stripe = new Stripe(key);
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }
  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, whsec);
  } catch (e) {
    return NextResponse.json({ error: `bad signature: ${e}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status !== "paid") {
      return NextResponse.json({ received: true, skipped: "not paid" });
    }
    const cfg = fromMetadata((session.metadata ?? {}) as Record<string, string>);
    if (!cfg) {
      return NextResponse.json({ error: "invalid order metadata" }, { status: 400 });
    }
    const sd = session.collected_information?.shipping_details ?? null;
    const email =
      session.customer_details?.email ?? session.customer_email ?? "";
    const addr = sd?.address;
    if (!sd?.name || !addr?.line1 || !addr.city || !addr.postal_code || !addr.country) {
      return NextResponse.json({ error: "missing shipping address" }, { status: 400 });
    }
    const ship: ShippingAddress = {
      name: sd.name,
      email,
      line1: addr.line1,
      line2: addr.line2 ?? "",
      city: addr.city,
      state: addr.state ?? "",
      zip: addr.postal_code,
      country: addr.country,
    };
    try {
      const order = await fulfillOrder(cfg, ship);
      return NextResponse.json({ received: true, prodigiOrderId: order.id });
    } catch (e) {
      // 5xx so Stripe retries; Prodigi idempotencyKey prevents duplicates.
      return NextResponse.json(
        { error: "fulfillment failed", detail: String(e) },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({ received: true });
}
