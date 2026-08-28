import Stripe from "stripe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const PRICE = 2250;
const VALID_STYLES = new Set(["fitted", "unisex"]);
const VALID_SIZES = new Set(["S", "M", "L", "XL", "2XL"]);

export async function POST(request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe is not configured yet. Add STRIPE_SECRET_KEY to continue." }, { status: 503 });
  }
  try {
    const body = await request.json();
    const style = VALID_STYLES.has(body.style) ? body.style : "fitted";
    const size = VALID_SIZES.has(body.size) ? body.size : "M";
    const timestamp = Number.isFinite(Number(body.timestamp)) ? Math.round(Number(body.timestamp)) : Date.now();
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const origin = process.env.APP_URL || request.headers.get("origin") || "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: PRICE,
          product_data: { name: "The Now Tee", description: `Black ${style} t-shirt · size ${size}`, metadata: { product: "the-now-tee" } },
        },
      }],
      shipping_address_collection: { allowed_countries: ["US", "CA", "GB", "AU", "NZ"] },
      phone_number_collection: { enabled: true },
      customer_creation: "always",
      metadata: { product: "the-now-tee", style, size, timestamp: String(timestamp) },
      payment_intent_data: { metadata: { product: "the-now-tee", style, size, timestamp: String(timestamp) } },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancel`,
      submit_type: "pay",
      custom_text: { submit: { message: "Your timestamp is printed after payment." }, shipping_address: { message: "We ship worldwide from the closest available print partner." } },
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("checkout_session_error", error);
    return NextResponse.json({ error: "We couldn’t open checkout. Please try again." }, { status: 500 });
  }
}
