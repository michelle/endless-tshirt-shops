import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { validateDesign } from "@/lib/design";
import { stripeClient } from "@/lib/stripe";
import { signDesign } from "@/lib/token";

export const runtime = "nodejs";
const sizes: Record<string, string> = { S: "s", M: "m", L: "l", XL: "xl", "2XL": "2xl" };
const colors = new Set(["black", "navy blue", "asphalt", "white"]);
const countries: Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[] = ["US", "CA", "GB", "AU", "NZ", "AT", "BE", "DK", "FI", "FR", "DE", "IE", "IT", "NL", "NO", "PL", "PT", "ES", "SE", "CH"];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const design = validateDesign(body.design);
    if (!sizes[body.size] || !colors.has(body.shirtColor)) return NextResponse.json({ error: "Choose an available shirt color and size." }, { status: 400 });
    const stripe = stripeClient();
    const artworkToken = signDesign(design);
    const origin = new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      submit_type: "pay",
      billing_address_collection: "auto",
      phone_number_collection: { enabled: true },
      shipping_address_collection: { allowed_countries: countries },
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: 4200,
          product_data: { name: "Signal Atlas — Personal Edition", description: `${design.name} · ${design.place} · ${design.date}` },
        },
      }],
      shipping_options: [{ shipping_rate_data: { type: "fixed_amount", fixed_amount: { amount: 600, currency: "usd" }, display_name: "Tracked global delivery", delivery_estimate: { minimum: { unit: "business_day", value: 6 }, maximum: { unit: "business_day", value: 12 } } } }],
      metadata: { artworkToken, size: sizes[body.size], color: body.shirtColor },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?checkout=cancelled#top`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("checkout_error", error);
    const message = error instanceof Error && error.message.includes("not configured") ? "Secure checkout is awaiting the store owner's Stripe key." : "We couldn’t start checkout. Please try again.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
