import { NextResponse } from "next/server";
import { catalog, isProductId, isShirtSize, PRODIGI_SKU } from "@/lib/catalog";
import { getStripe } from "@/lib/stripe";

const allowedCountries = ["US", "CA", "GB", "AU", "NZ", "FR", "DE", "ES", "IT", "NL", "SE", "DK", "NO", "IE", "PT", "BE", "AT", "CH"] as const;

export async function POST(request: Request) {
  const form = await request.formData();
  const productId = form.get("productId");
  const size = form.get("size");
  if (!isProductId(productId) || !isShirtSize(size)) return NextResponse.json({ error: "Invalid product selection" }, { status: 400 });

  try {
    const origin = new URL(request.url).origin;
    const product = catalog[productId];
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/#shop`,
      customer_creation: "always",
      billing_address_collection: "auto",
      shipping_address_collection: { allowed_countries: [...allowedCountries] },
      phone_number_collection: { enabled: true },
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: 3200,
          product_data: { name: product.name, description: `${product.description} Size ${size.toUpperCase()}.`, images: [`${origin}/products/${productId}.png`] },
        },
      }],
      metadata: { product_id: productId, size, color: product.color, prodigi_sku: PRODIGI_SKU, asset_base_url: origin },
    });
    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return NextResponse.redirect(session.url, 303);
  } catch (error) {
    console.error("Checkout creation failed", error);
    return NextResponse.redirect(`${new URL(request.url).origin}/checkout-error`, 303);
  }
}
