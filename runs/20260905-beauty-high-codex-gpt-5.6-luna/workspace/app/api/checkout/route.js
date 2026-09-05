import { NextResponse } from "next/server";
import Stripe from "stripe";

const PRICE = 2250;
const VALID_STYLES = new Set(["fitted", "unisex"]);
const VALID_SIZES = new Set(["S", "M", "L", "XL"]);

function appUrl(request) {
  return process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || new URL(request.url).origin;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const style = VALID_STYLES.has(body.style) ? body.style : "fitted";
    const size = VALID_SIZES.has(body.size) ? body.size : "M";
    const timestamp = new Date(body.timestamp);
    if (Number.isNaN(timestamp.getTime())) return NextResponse.json({ error: "That moment is no longer valid. Please try again." }, { status: 400 });

    const baseUrl = appUrl(request);
    const metadata = { style, size, timestamp: timestamp.toISOString() };
    const secret = process.env.STRIPE_SECRET_KEY;

    if (!secret) {
      if (process.env.CHECKOUT_DEMO_MODE === "true" || process.env.NODE_ENV !== "production") {
        return NextResponse.json({ url: `${baseUrl}/success?demo=1`, demo: true, message: "Demo checkout complete — no card was charged." });
      }
      return NextResponse.json({ error: "Checkout is being connected. Add STRIPE_SECRET_KEY to enable payments." }, { status: 503 });
    }

    const stripe = new Stripe(secret);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "usd",
          unit_amount: PRICE,
          product_data: {
            name: "datetime tee",
            description: `${style === "fitted" ? "Fitted" : "Unisex"} · size ${size} · printed ${timestamp.toISOString()}`,
          },
        },
        quantity: 1,
      }],
      shipping_address_collection: { allowed_countries: ["US", "CA", "GB", "AU", "NZ", "DE", "FR", "NL"] },
      billing_address_collection: "required",
      customer_creation: "always",
      metadata,
      payment_intent_data: { metadata },
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/cancel`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("checkout_error", error);
    return NextResponse.json({ error: "We hit a small time hiccup. Please try again." }, { status: 500 });
  }
}
