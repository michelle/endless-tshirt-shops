import Stripe from "stripe";

export const runtime = "nodejs";

const VALID_STYLES = new Set(["fitted", "unisex"]);
const VALID_SIZES = new Set(["S", "M", "L", "XL"]);

export async function POST(request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) return Response.json({ error: "Checkout is not configured yet." }, { status: 503 });
    const { style, size, timestamp } = await request.json();
    if (!VALID_STYLES.has(style) || !VALID_SIZES.has(size) || !/^\d{13}$/.test(String(timestamp))) {
      return Response.json({ error: "Please select a valid shirt option." }, { status: 400 });
    }
    const origin = new URL(request.url).origin;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      shipping_address_collection: { allowed_countries: ["US"] },
      phone_number_collection: { enabled: true },
      billing_address_collection: "auto",
      allow_promotion_codes: false,
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?cancelled=1`,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: 2250,
          product_data: {
            name: "datetime.store t-shirt",
            description: `Black ${style} t-shirt, printed with Unix time ${timestamp}.`,
          },
        },
      }],
      shipping_options: [{ shipping_rate_data: { type: "fixed_amount", fixed_amount: { amount: 0, currency: "usd" }, display_name: "Free US shipping" } }],
      metadata: { style, size, timestamp: String(timestamp), product: "datetime.store" },
    // A timestamp makes repeat clicks safe, while scoping it to the current
    // storefront origin prevents a test deployment from colliding with local
    // or production Checkout sessions.
    }, { idempotencyKey: `datetime-checkout-${new URL(origin).hostname}-${timestamp}-${style}-${size}` });
    return Response.json({ url: session.url });
  } catch (error) {
    console.error("checkout", error);
    // Stripe's typed error code is safe to return and makes a misconfigured
    // sandbox diagnosable without exposing credential or request details.
    return Response.json({ error: "We couldn’t start secure checkout. Please try again.", reason: error.type || error.code || "unknown" }, { status: 500 });
  }
}
