import Stripe from "stripe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const validSizes = new Set(["S", "M", "L", "XL"]);
const validFits = new Set(["classic", "roomy"]);

function siteUrl(request: Request) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  return new URL(request.url).origin;
}

export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Checkout is not configured yet. Please try again soon." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const designTime = typeof body.designTime === "string" ? new Date(body.designTime) : null;
    if (!designTime || Number.isNaN(designTime.getTime()) || !validSizes.has(body.size) || !validFits.has(body.fit)) {
      return NextResponse.json({ error: "That moment got a little blurry. Refresh and try again." }, { status: 400 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const origin = siteUrl(request);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      billing_address_collection: "auto",
      customer_creation: "always",
      shipping_address_collection: { allowed_countries: ["US"] },
      shipping_options: [{
        shipping_rate_data: {
          type: "fixed_amount",
          display_name: "Standard shipping (free, somehow)",
          fixed_amount: { amount: 0, currency: "usd" },
          delivery_estimate: { minimum: { unit: "business_day", value: 5 }, maximum: { unit: "business_day", value: 10 } },
        },
      }],
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: 2250,
          product_data: { name: "The Current Datetime T-Shirt", description: "A black tee bearing one extremely specific instant." },
        },
      }],
      metadata: { designTime: designTime.toISOString(), size: body.size, fit: body.fit, product: "TEE-AS-5001" },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancel`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout creation failed", error);
    return NextResponse.json({ error: "Checkout took a wrong turn. Please try again." }, { status: 500 });
  }
}
