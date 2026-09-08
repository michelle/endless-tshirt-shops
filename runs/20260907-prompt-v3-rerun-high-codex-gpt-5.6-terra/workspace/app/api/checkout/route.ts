import Stripe from "stripe";

export const runtime = "nodejs";

const allowedSizes = new Set(["xs", "s", "m", "l", "xl", "2xl", "3xl"]);
const allowedColors = new Set(["black", "white"]);
const allowedPalettes = new Set(["amber", "blue", "rose"]);
const allowedSigns = new Set(["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]);
const tidy = (value: unknown, max: number) => typeof value === "string" ? value.replace(/[<>]/g, "").trim().slice(0, max) : "";

export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY) return Response.json({ error: "Checkout is not configured yet. Add STRIPE_SECRET_KEY in Vercel." }, { status: 503 });
  try {
    const body = await request.json();
    const name = tidy(body.name, 24);
    const place = tidy(body.place, 28).toUpperCase();
    const sign = tidy(body.sign, 16);
    const palette = tidy(body.palette, 12);
    const color = tidy(body.color, 10);
    const size = tidy(body.size, 6);
    if (!name || !place || !allowedSigns.has(sign) || !allowedPalettes.has(palette) || !allowedColors.has(color) || !allowedSizes.has(size)) {
      return Response.json({ error: "Please complete the personalization fields." }, { status: 400 });
    }
    // Prefer the actual deployed origin so artwork and return URLs remain correct for Vercel preview/production aliases.
    const origin = new URL(request.url).origin;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      submit_type: "pay",
      customer_creation: "always",
      billing_address_collection: "required",
      phone_number_collection: { enabled: true },
      shipping_address_collection: { allowed_countries: ["US", "CA", "GB", "AU", "NZ", "AT", "BE", "CH", "DE", "DK", "ES", "FI", "FR", "IE", "IT", "NL", "NO", "PT", "SE"] },
      shipping_options: [{ shipping_rate_data: { type: "fixed_amount", fixed_amount: { amount: 695, currency: "usd" }, display_name: "Tracked standard shipping", delivery_estimate: { minimum: { unit: "business_day", value: 5 }, maximum: { unit: "business_day", value: 10 } } } }],
      line_items: [{ price_data: { currency: "usd", unit_amount: 3900, product_data: { name: "Star Signal — personalized field-note tee", description: `${name} · ${place} · ${sign}`, images: [`${origin}/api/design?${new URLSearchParams({ name, place, sign, palette })}`] }, }, quantity: 1 }],
      metadata: { name, place, sign, palette, color, size, artwork_origin: origin, sku: "TEE-SS-STTU755" },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/#create`
    });
    return Response.json({ url: session.url });
  } catch (error) {
    console.error("checkout_error", error);
    return Response.json({ error: "Unable to start secure checkout. Please try again." }, { status: 500 });
  }
}
