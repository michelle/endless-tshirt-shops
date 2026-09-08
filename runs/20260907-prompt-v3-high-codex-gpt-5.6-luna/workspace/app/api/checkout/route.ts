import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const allowedThemes = new Set(["midnight", "ember", "ultraviolet"]);
const allowedSizes = new Set(["s", "m", "l", "xl", "2xl"]);
const allowedColors = new Set(["black", "dark grey", "heather grey", "navy blue", "white"]);

function getSiteUrl(request: NextRequest) {
  return process.env.SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` || process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}` || request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "Checkout is being connected. Add STRIPE_SECRET_KEY to enable payments." }, { status: 503 });
  try {
    const body = await request.json();
    const phrase = String(body.phrase || "").replace(/[^a-zA-Z0-9 .,!?'&-]/g, "").trim().slice(0, 32);
    const theme = String(body.theme || "midnight");
    const size = String(body.size || "m");
    const color = String(body.color || "black");
    const quantity = Math.min(3, Math.max(1, Number(body.quantity) || 1));
    if (!phrase || !allowedThemes.has(theme) || !allowedSizes.has(size) || !allowedColors.has(color)) return NextResponse.json({ error: "Please check your design choices and try again." }, { status: 400 });
    const stripe = new Stripe(secret);
    const siteUrl = getSiteUrl(request);
    const designUrl = new URL(`/api/design?phrase=${encodeURIComponent(phrase)}&theme=${encodeURIComponent(theme)}`, siteUrl).toString();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price_data: { currency: "usd", product_data: { name: `Signal / Noise — ${phrase}`, description: `AS Colour 5001 · ${size.toUpperCase()} · ${color} · ${theme}`, images: [designUrl] }, unit_amount: 3800 }, quantity }],
      shipping_address_collection: { allowed_countries: ["US", "CA", "GB", "AU", "NZ", "DE", "FR", "NL", "IE"] },
      shipping_options: [{ shipping_rate_data: { type: "fixed_amount", fixed_amount: { amount: 590, currency: "usd" }, display_name: "Standard shipping", delivery_estimate: { minimum: { unit: "business_day", value: 7 }, maximum: { unit: "business_day", value: 12 } } } }],
      customer_creation: "always",
      allow_promotion_codes: true,
      metadata: { phrase, theme, size, color, quantity: String(quantity), designUrl },
      success_url: `${siteUrl}/?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/?canceled=1`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error", error);
    return NextResponse.json({ error: "We couldn't open checkout. Please try again." }, { status: 500 });
  }
}
