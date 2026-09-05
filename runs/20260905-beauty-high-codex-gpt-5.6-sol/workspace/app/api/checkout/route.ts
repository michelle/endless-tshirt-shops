import { NextRequest, NextResponse } from "next/server";
import { parseOrderInput, PRODUCT } from "../../../lib/product";
import { getStripe } from "../../../lib/stripe";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const order = parseOrderInput(await request.json());
    const stripe = getStripe();
    const origin = request.nextUrl.origin;
    const artworkUrl = `${origin}/api/artwork?timestamp=${order.timestamp}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_creation: "always",
      billing_address_collection: "auto",
      shipping_address_collection: { allowed_countries: ["US"] },
      phone_number_collection: { enabled: true },
      line_items: [{
        quantity: order.quantity,
        price_data: {
          currency: PRODUCT.currency,
          unit_amount: PRODUCT.unitAmount,
          product_data: {
            name: PRODUCT.name,
            description: `${order.size} · Black · Timestamp ${order.timestamp}`,
            images: [`${origin}/gildan-black.webp`],
          },
        },
      }],
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/#atelier`,
      metadata: {
        timestamp: String(order.timestamp),
        size: order.size,
        color: order.color,
        quantity: String(order.quantity),
        prodigi_sku: PRODUCT.sku,
        artwork_url: artworkUrl,
      },
      payment_intent_data: {
        description: `datetime.store moment ${order.timestamp}`,
        metadata: { timestamp: String(order.timestamp), size: order.size },
      },
      custom_text: {
        shipping_address: { message: "U.S. shipping is included. Your one-off shirt is made after payment." },
        submit: { message: "Your timestamp design is frozen and ready for print." },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout creation failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Checkout could not be started." },
      { status: 400 },
    );
  }
}
