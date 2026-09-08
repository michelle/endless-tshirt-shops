import { NextResponse } from "next/server";
import { parseDesign, PALETTES, PRODUCT } from "@/lib/design";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const design = parseDesign(await request.json());
    const stripe = getStripe();
    const origin = process.env.PUBLIC_SITE_URL || new URL(request.url).origin;
    const metadata = Object.fromEntries(Object.entries(design).map(([key, value]) => [key, String(value)]));
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{
        quantity: design.quantity,
        price_data: {
          currency: PRODUCT.currency,
          unit_amount: PRODUCT.unitAmount,
          product_data: {
            name: PRODUCT.name,
            description: `${design.place} · ${PALETTES[design.palette].name} · ${design.size.toUpperCase()}`,
            metadata: { product_sku: PRODUCT.sku },
          },
        },
      }],
      metadata,
      customer_creation: "always",
      billing_address_collection: "auto",
      shipping_address_collection: { allowed_countries: ["US", "CA", "GB", "AU", "NZ", "DE", "FR", "NL", "ES", "IT"] },
      phone_number_collection: { enabled: true },
      custom_text: { shipping_address: { message: "Worldwide shipping is included. Your custom shirt is typically produced in 3–5 business days." } },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/#make-yours`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout could not be started.";
    return NextResponse.json({ error: message }, { status: message.includes("not configured") ? 503 : 400 });
  }
}
