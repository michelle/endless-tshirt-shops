import Stripe from "stripe";
import { createArtToken, validateDesign } from "../../../lib/design";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY) return Response.json({ error: "Checkout is not configured yet. Add STRIPE_SECRET_KEY in Vercel, then try again." }, { status: 503 });
  try {
    const body = await request.json();
    const design = validateDesign(body.design);
    const token = createArtToken(design);
    const origin = request.headers.get("origin") || new URL(request.url).origin;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        { price_data: { currency: "usd", unit_amount: 4800, product_data: { name: `Orbital Post — ${design.place}`, description: `${design.size} AS Colour 5001 tee · ${design.color}` } }, quantity: 1 },
        { price_data: { currency: "usd", unit_amount: 600, product_data: { name: "Tracked shipping" } }, quantity: 1 }
      ],
      shipping_address_collection: { allowed_countries: ["US", "CA", "GB", "AU", "NZ", "IE", "DE", "FR", "NL", "ES", "IT"] },
      phone_number_collection: { enabled: true },
      billing_address_collection: "auto",
      customer_creation: "always",
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/#builder`,
      metadata: { designToken: token, size: design.size, color: design.color, place: design.place, name: design.name, message: design.message, accent: design.accent },
      payment_intent_data: { description: `Orbital Post custom tee for ${design.name}` }
    });
    return Response.json({ url: session.url });
  } catch (error) {
    console.error("checkout_create_failed", error);
    return Response.json({ error: error instanceof Error ? error.message : "Checkout could not start." }, { status: 400 });
  }
}
