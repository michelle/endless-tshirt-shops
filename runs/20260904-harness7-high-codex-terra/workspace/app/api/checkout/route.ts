import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

const validSizes = new Set(["S", "M", "L", "XL", "2XL"]);
const validStyles = new Set(["unisex", "fitted"]);

export async function POST(request: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Checkout is being connected. Add STRIPE_SECRET_KEY to enable payments." }, { status: 503 });
  }
  try {
    const body = await request.json();
    const timestamp = Number(body.timestamp);
    const size = String(body.size || "");
    const style = String(body.style || "");
    if (!Number.isSafeInteger(timestamp) || timestamp < 1700000000000 || timestamp > Date.now() + 60_000 || !validSizes.has(size) || !validStyles.has(style)) {
      return NextResponse.json({ error: "That shirt configuration is not valid." }, { status: 400 });
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const origin = request.headers.get("origin") || `${request.headers.get("x-forwarded-proto") || "https"}://${request.headers.get("x-forwarded-host") || request.headers.get("host")}`;
    const session = await stripe.checkout.sessions.create({
      mode: "payment", payment_method_types: ["card"],
      billing_address_collection: "required", shipping_address_collection: { allowed_countries: ["US", "CA", "GB", "AU", "DE", "FR", "IE", "NL", "ES", "IT", "SE"] },
      shipping_options: [{ shipping_rate_data: { type: "fixed_amount", fixed_amount: { amount: 0, currency: "usd" }, display_name: "Standard shipping", delivery_estimate: { minimum: { unit: "business_day", value: 5 }, maximum: { unit: "business_day", value: 10 } } } }],
      line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: 3000, product_data: { name: "The datetime shirt", description: `${style === "fitted" ? "Fitted" : "Unisex"}, ${size} — timestamp ${timestamp}` } } }],
      metadata: { timestamp: String(timestamp), size, style },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?cancelled=1`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("checkout_error", error);
    return NextResponse.json({ error: "Checkout could not start. Please try again." }, { status: 500 });
  }
}
