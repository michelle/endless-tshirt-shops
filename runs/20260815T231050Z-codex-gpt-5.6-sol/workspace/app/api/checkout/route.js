import { NextResponse } from "next/server";
import { PRICE_CENTS, STYLES, timestampLabel, validSelection } from "../../../lib/catalog";
import { stripeClient } from "../../../lib/stripe";

export async function POST(request) {
  try {
    const { style, size, timestamp } = await request.json();
    const imprint = timestampLabel(timestamp);
    if (!validSelection(style, size) || !imprint) return NextResponse.json({ error: "Invalid shirt selection" }, { status: 400 });
    const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    const session = await stripeClient().checkout.sessions.create({
      mode: "payment",
      line_items: [{ price_data: { currency: "usd", unit_amount: PRICE_CENTS, product_data: { name: `${imprint} / datetime tee`, description: `${STYLES[style].label} · ${size} · black`, metadata: { timestamp: imprint } } }, quantity: 1 }],
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?canceled=1`,
      customer_creation: "always",
      billing_address_collection: "auto",
      shipping_address_collection: { allowed_countries: ["US"] },
      phone_number_collection: { enabled: false },
      metadata: { style, size, timestamp: imprint, fulfillment: "pending" },
      payment_intent_data: { metadata: { style, size, timestamp: imprint, fulfillment: "pending" } },
      allow_promotion_codes: true,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("checkout", error);
    return NextResponse.json({ error: "Checkout is temporarily unavailable." }, { status: 500 });
  }
}
