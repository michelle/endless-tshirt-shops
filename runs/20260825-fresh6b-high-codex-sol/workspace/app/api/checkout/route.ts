import { NextResponse } from "next/server";
import { CURRENCY, parseSelection, PRICE_CENTS, PRODUCT_BY_FIT } from "../../../lib/catalog";
import { getStripe } from "../../../lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const selection = parseSelection(await request.json());
    if (!selection) {
      return NextResponse.json({ error: "Please choose a valid fit and size, then try again." }, { status: 400 });
    }

    const stripe = getStripe();
    const product = PRODUCT_BY_FIT[selection.fit];
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/$/, "");
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      submit_type: "pay",
      success_url: `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/?checkout=cancelled`,
      customer_creation: "always",
      billing_address_collection: "auto",
      shipping_address_collection: { allowed_countries: ["US"] },
      shipping_options: [
        { shipping_rate_data: { display_name: "Free standard shipping", type: "fixed_amount", fixed_amount: { amount: 0, currency: CURRENCY }, delivery_estimate: { minimum: { unit: "business_day", value: 5 }, maximum: { unit: "business_day", value: 10 } } } }
      ],
      phone_number_collection: { enabled: true },
      allow_promotion_codes: false,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: CURRENCY,
            unit_amount: PRICE_CENTS,
            product_data: {
              name: `The Exact-Time Tee — ${product.label}, ${selection.size}`,
              description: `Black ${product.description}. Printed with ${selection.timestamp}.`,
              metadata: { prodigi_sku: product.sku }
            }
          }
        }
      ],
      metadata: {
        fit: selection.fit,
        size: selection.size,
        timestamp: String(selection.timestamp),
        prodigi_sku: product.sku,
        fulfillment: "prodigi"
      }
    });

    if (!session.url) throw new Error("Stripe did not return a checkout URL.");
    return NextResponse.json({ url: session.url }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Checkout Session creation failed", error);
    return NextResponse.json({ error: "Secure checkout is temporarily unavailable. Please try again." }, { status: 500 });
  }
}
