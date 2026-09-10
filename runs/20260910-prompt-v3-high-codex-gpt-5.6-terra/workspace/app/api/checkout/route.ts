import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

const colors = ["black", "white", "navy blue", "oxblood black"];
const sizes = ["s", "m", "l", "xl", "2xl"];
const moods = ["stargazer", "trailblazer", "daydreamer", "nightowl"];

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().replace(/[<>]/g, "").slice(0, max) : "";
}

export async function POST(request: NextRequest) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return NextResponse.json({ error: "Checkout is not configured yet. Add STRIPE_SECRET_KEY to this deployment." }, { status: 503 });
  const body = await request.json().catch(() => null);
  const name = text(body?.name, 28), place = text(body?.place, 38), credo = text(body?.credo, 65);
  const mood = text(body?.mood, 20), color = text(body?.color, 30), size = text(body?.size, 8);
  if (!name || !place || !credo || !moods.includes(mood) || !colors.includes(color) || !sizes.includes(size)) return NextResponse.json({ error: "Please complete the customizer with a valid shirt option." }, { status: 400 });
  const stripe = new Stripe(key);
  const origin = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
  const art = new URL("/api/print-art", origin);
  art.search = new URLSearchParams({ name, place, credo, mood, color }).toString();
  const session = await stripe.checkout.sessions.create({
    mode: "payment", payment_method_types: ["card"], billing_address_collection: "required", shipping_address_collection: { allowed_countries: ["US"] },
    shipping_options: [{ shipping_rate_data: { type: "fixed_amount", fixed_amount: { amount: 599, currency: "usd" }, display_name: "Tracked US shipping", delivery_estimate: { minimum: { unit: "business_day", value: 5 }, maximum: { unit: "business_day", value: 8 } } } }],
    line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: 3600, product_data: { name: "Futurefolk custom field-guide tee", description: `${name} · ${color} · ${size.toUpperCase()}`, images: [art.toString()] } } }],
    metadata: { name, place, credo, mood, color, size, artworkUrl: art.toString(), productSku: "GLOBAL-TEE-BC-3003" }, success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${origin}/?checkout=cancelled#studio`,
  });
  return NextResponse.json({ url: session.url });
}
