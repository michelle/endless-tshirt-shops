import Stripe from "stripe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
const PRICE_CENTS = 2250;
const allowedStyles = new Set(["fitted", "unisex"]);
const allowedSizes = new Set(["S", "M", "L", "XL"]);

function stripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Payments are not configured yet.");
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export async function POST(request: Request) {
  try {
    const { style, size, email, timestamp } = await request.json();
    if (!allowedStyles.has(style) || !allowedSizes.has(size) || typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "Please choose a shirt option and enter a valid email." }, { status: 400 });
    }
    const lockedTime = Number(timestamp);
    if (!Number.isFinite(lockedTime) || Math.abs(Date.now() - lockedTime) > 1000 * 60 * 20) {
      return NextResponse.json({ error: "That time has expired. Refresh the page and try again." }, { status: 400 });
    }
    const origin = new URL(request.url).origin;
    const session = await stripeClient().checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      billing_address_collection: "auto",
      shipping_address_collection: { allowed_countries: ["US"] },
      shipping_options: [{ shipping_rate_data: { type: "fixed_amount", fixed_amount: { amount: 0, currency: "usd" }, display_name: "Free US shipping", delivery_estimate: { minimum: { unit: "business_day", value: 5 }, maximum: { unit: "business_day", value: 10 } } } }],
      line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: PRICE_CENTS, product_data: { name: "datetime.store t-shirt", description: `Black ${style} shirt, printed with ${lockedTime}` } } }],
      metadata: { style, size, timestamp: String(lockedTime), fulfillment: process.env.FULFILLMENT_MODE || "dry_run" },
      payment_intent_data: { metadata: { style, size, timestamp: String(lockedTime) } },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?checkout=cancelled`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("checkout-session", error);
    return NextResponse.json({ error: "Checkout is temporarily unavailable. Please try again." }, { status: 500 });
  }
}
