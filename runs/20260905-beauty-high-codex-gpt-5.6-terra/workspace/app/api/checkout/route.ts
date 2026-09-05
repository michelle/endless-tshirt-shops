import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { encodeMoment, type Moment } from "@/lib/artwork";

export const runtime = "nodejs";

const validSizes = new Set(["s", "m", "l", "xl", "2xl"]);
const validColors = new Set(["black", "navy blue", "white", "natural"]);

export async function POST(request: NextRequest) {
  try {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return NextResponse.json({ error: "Checkout is being tuned. Please try again shortly." }, { status: 503 });
    const input = await request.json();
    const moment = input.moment as Moment;
    const size = String(input.size || "m").toLowerCase();
    const color = String(input.color || "black").toLowerCase();
    if (!moment?.iso || !/^\d{10,16}$/.test(moment.ms || "") || !validSizes.has(size) || !validColors.has(color)) return NextResponse.json({ error: "That moment slipped away. Please refresh and try again." }, { status: 400 });
    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL;
    if (!origin) throw new Error("A public site URL is required for checkout");
    const printMoment: Moment = { ...moment, ink: ["white", "natural"].includes(color) ? "dark" : "light" };
    const stripe = new Stripe(key);
    const session = await stripe.checkout.sessions.create({
      mode: "payment", payment_method_types: ["card"], customer_creation: "always",
      billing_address_collection: "required", shipping_address_collection: { allowed_countries: ["US", "CA", "GB", "AU", "IE", "DE", "FR", "NL", "ES", "IT", "SE"] },
      phone_number_collection: { enabled: true },
      allow_promotion_codes: true,
      line_items: [{ price_data: { currency: "usd", product_data: { name: "The Timestamp Tee", description: `A wearable record of ${moment.iso}` }, unit_amount: 3600 }, quantity: 1 }],
      shipping_options: [{ shipping_rate_data: { type: "fixed_amount", fixed_amount: { amount: 0, currency: "usd" }, display_name: "Standard shipping — on us", delivery_estimate: { minimum: { unit: "business_day", value: 4 }, maximum: { unit: "business_day", value: 8 } } } }],
      metadata: { moment: encodeMoment(printMoment), size, color },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?checkout=cancelled`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("checkout", error);
    return NextResponse.json({ error: "Could not start secure checkout." }, { status: 500 });
  }
}
