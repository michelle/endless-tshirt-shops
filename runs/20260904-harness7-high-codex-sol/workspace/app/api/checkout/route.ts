import { NextResponse } from "next/server";
import { PRODUCT, isStoreSize, isTimestamp } from "../../../lib/store";
import { getStripe } from "../../../lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { size?: unknown; timestamp?: unknown };
    if (!isStoreSize(body.size) || !isTimestamp(body.timestamp)) return NextResponse.json({ error: "Choose a valid size and try again." }, { status: 400 });

    const origin = (process.env.SITE_URL || new URL(request.url).origin).replace(/\/$/, "");
    const timestamp = String(body.timestamp);
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_creation: "always",
      phone_number_collection: { enabled: true },
      shipping_address_collection: { allowed_countries: ["US"] },
      line_items: [{
        quantity: 1,
        price_data: {
          currency: PRODUCT.currency,
          unit_amount: PRODUCT.unitAmount,
          product_data: {
            name: `${PRODUCT.name} — ${timestamp}`,
            description: `Black / ${body.size} / one-of-one Unix millisecond print`,
          },
        },
      }],
      metadata: { timestamp, size: body.size, prodigiSku: PRODUCT.sku },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?checkout=cancelled`,
      custom_text: {
        shipping_address: { message: "US shipping is included. Printed on demand after payment." },
        submit: { message: `Your shirt will be printed with ${timestamp}.` },
      },
    }, { idempotencyKey: `checkout-${timestamp}-${body.size}` });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout session creation failed", error);
    return NextResponse.json({ error: "Checkout is temporarily unavailable. Please try again." }, { status: 500 });
  }
}
