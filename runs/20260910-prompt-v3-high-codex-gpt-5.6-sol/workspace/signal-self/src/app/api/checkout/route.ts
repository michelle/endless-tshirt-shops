import { createArtworkToken } from "@/lib/artwork-token";
import { GARMENTS, PALETTES, PRODUCT, customizationSchema } from "@/lib/product";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const customization = customizationSchema.parse(await request.json());
    const origin = new URL(request.url).origin;
    const token = createArtworkToken(customization);
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: `signal-${Date.now()}`,
      customer_creation: "always",
      billing_address_collection: "auto",
      shipping_address_collection: { allowed_countries: ["US", "CA", "GB", "AU", "NZ"] },
      phone_number_collection: { enabled: true },
      line_items: [{
        quantity: customization.quantity,
        price_data: {
          currency: PRODUCT.currency,
          unit_amount: PRODUCT.unitAmount,
          product_data: {
            name: PRODUCT.name,
            description: `${GARMENTS[customization.garment].name} · ${customization.size} · ${PALETTES[customization.palette].name}`,
          },
        },
      }],
      shipping_options: [{
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: { amount: PRODUCT.shippingAmount, currency: PRODUCT.currency },
          display_name: "Tracked standard shipping",
          delivery_estimate: {
            minimum: { unit: "business_day", value: 5 },
            maximum: { unit: "business_day", value: 10 },
          },
        },
      }],
      metadata: {
        product: "signal-self-shirt",
        phrase: customization.phrase,
        detail: customization.detail,
        palette: customization.palette,
        garment: customization.garment,
        size: customization.size,
        quantity: String(customization.quantity),
        artwork_token: token,
      },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?checkout=canceled#top`,
    });

    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return Response.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error && error.message.includes("STRIPE_SECRET_KEY")
      ? "Checkout is waiting for the store's Stripe test key."
      : "We couldn't start checkout. Please check your design and try again.";
    return Response.json({ error: message }, { status: message.includes("Stripe") ? 503 : 400 });
  }
}
