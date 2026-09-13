import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { buildPrintUrl, cleanCustomization } from "@/lib/order";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const customization = cleanCustomization(await request.json().catch(() => null));
  if (!customization) return NextResponse.json({ error: "Please complete every personalization field." }, { status: 400 });
  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: "Checkout is temporarily unavailable. Please try again shortly." }, { status: 503 });
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const origin = new URL(request.url).origin;
    const printUrl = buildPrintUrl(origin, customization);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_creation: "always",
      shipping_address_collection: { allowed_countries: ["US"] },
      shipping_options: [{ shipping_rate_data: { type: "fixed_amount", fixed_amount: { amount: 599, currency: "usd" }, display_name: "US standard shipping", delivery_estimate: { minimum: { unit: "business_day", value: 4 }, maximum: { unit: "business_day", value: 8 } } } }],
      line_items: [{ price_data: { currency: "usd", unit_amount: 3200, product_data: { name: "Tiny Triumphs — Personal edition tee", description: `${customization.moment} · ${customization.name}` }, }, quantity: 1 }],
      metadata: { ...customization, printUrl },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/#maker`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout creation failed", error);
    return NextResponse.json({ error: "Could not start secure checkout. Please try again." }, { status: 502 });
  }
}
