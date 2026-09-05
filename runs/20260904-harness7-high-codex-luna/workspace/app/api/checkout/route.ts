import Stripe from "stripe";
import { artworkUrl, isShirtSize, isShirtStyle, PRICE_CENTS, PRODUCT_NAME, safeTimestamp } from "../../../lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!isShirtStyle(body.style) || !isShirtSize(body.size)) {
      return Response.json({ error: "Choose a valid cut and size." }, { status: 400 });
    }
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) return Response.json({ error: "Stripe is not configured on this environment." }, { status: 503 });

    const stripe = new Stripe(secretKey);
    const timestampMs = safeTimestamp(body.timestampMs);
    const origin = process.env.SITE_URL || new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      submit_type: "pay",
      customer_creation: "always",
      billing_address_collection: "auto",
      shipping_address_collection: { allowed_countries: ["US"] },
      shipping_options: [{ shipping_rate_data: { type: "fixed_amount", fixed_amount: { amount: 0, currency: "usd" }, display_name: "Free shipping", delivery_estimate: { minimum: { unit: "business_day", value: 5 }, maximum: { unit: "business_day", value: 8 } } } }],
      line_items: [{ price_data: { currency: "usd", unit_amount: PRICE_CENTS, product_data: { name: PRODUCT_NAME, description: `${body.style} cut · size ${body.size} · timestamp ${timestampMs}`, images: [artworkUrl(origin, timestampMs)] } }, quantity: 1 }],
      metadata: { style: body.style, size: body.size, timestampMs: String(timestampMs) },
      success_url: `${origin}/?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?canceled=1`,
    });
    return Response.json({ url: session.url });
  } catch (error) {
    console.error("checkout_session_error", error);
    return Response.json({ error: "We couldn’t open secure checkout. Please try again." }, { status: 500 });
  }
}
