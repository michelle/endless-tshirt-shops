import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getBaseUrl } from "@/lib/site";
import { createProdigiOrder } from "@/lib/prodigi";
import { PaletteId } from "@/lib/constellation";

export const runtime = "nodejs";

// Stripe is the single source of truth for whether an order should be sent
// to print: this handler only fires a Prodigi order once
// `checkout.session.completed` reports the payment as actually paid, and it
// is idempotent (keyed on the Checkout Session id) so Stripe's automatic
// webhook retries can never create a duplicate print job.
export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const rawBody = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    return NextResponse.json({ error: `Invalid signature: ${(err as Error).message}` }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true, skipped: event.type });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  if (session.payment_status !== "paid") {
    return NextResponse.json({ received: true, skipped: "not paid yet" });
  }

  const md = session.metadata || {};
  const title = md.design_title;
  const dateLabel = md.design_date;
  const subtitle = md.design_subtitle || "";
  const palette = (md.design_palette || "midnight") as PaletteId;
  const color = md.shirt_color;
  const size = md.shirt_size;
  const quantity = Number(md.quantity || "1");

  if (!title || !dateLabel || !color || !size) {
    console.error("Webhook: missing design metadata on session", session.id);
    return NextResponse.json({ error: "Missing design metadata" }, { status: 400 });
  }

  const shipping = session.collected_information?.shipping_details;
  const customer = session.customer_details;
  const address = shipping?.address || customer?.address;
  const recipientName = shipping?.name || customer?.name;

  if (!address || !recipientName) {
    console.error("Webhook: missing shipping address on session", session.id);
    return NextResponse.json({ error: "Missing shipping address" }, { status: 400 });
  }

  const baseUrl = getBaseUrl(req);
  const artworkParams = new URLSearchParams({ title, date: dateLabel, subtitle, palette });
  const artworkUrl = `${baseUrl}/api/artwork?${artworkParams.toString()}&format=png`;

  try {
    const result = await createProdigiOrder({
      merchantReference: session.id,
      idempotencyKey: session.id,
      copies: quantity,
      color,
      size,
      artworkUrl,
      recipient: {
        name: recipientName,
        email: customer?.email || undefined,
        phoneNumber: customer?.phone || undefined,
        address: {
          line1: address.line1 || "",
          line2: address.line2 || undefined,
          townOrCity: address.city || "",
          stateOrCounty: address.state || undefined,
          postalOrZipCode: address.postal_code || "",
          countryCode: address.country || "US",
        },
      },
    });

    if (!result.ok) {
      console.error("Prodigi order failed for session", session.id, JSON.stringify(result.raw));
      return NextResponse.json({ error: "Prodigi order failed", details: result.raw }, { status: 502 });
    }

    // Stash the fulfillment order id on the PaymentIntent so the success
    // page (and any future admin tooling) can look it up from the session.
    if (typeof session.payment_intent === "string" && result.orderId) {
      await stripe.paymentIntents.update(session.payment_intent, {
        metadata: { prodigi_order_id: result.orderId, prodigi_status: result.orderStatus || "" },
      });
    }

    return NextResponse.json({ received: true, prodigiOrderId: result.orderId });
  } catch (err) {
    console.error("Error creating Prodigi order for session", session.id, err);
    // Returning 500 makes Stripe retry the webhook automatically.
    return NextResponse.json({ error: "Internal error placing print order" }, { status: 500 });
  }
}
