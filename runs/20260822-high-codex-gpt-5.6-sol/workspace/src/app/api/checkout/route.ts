import { NextRequest, NextResponse } from "next/server";
import { PRODUCT } from "@/lib/config";
import { getStripe } from "@/lib/stripe";
import { orderOptionsSchema } from "@/lib/validation";

export const runtime = "nodejs";

function requestOrigin(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
  if (!host) throw new Error("Missing request host.");
  return `${protocol}://${host}`;
}

export async function POST(request: NextRequest) {
  try {
    const parsed = orderOptionsSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Please choose a valid cut and size." }, { status: 400 });
    const { style, size, timestamp } = parsed.data;
    const origin = requestOrigin(request);
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      customer_creation: "always",
      billing_address_collection: "auto",
      shipping_address_collection: { allowed_countries: ["US"] },
      shipping_options: [{ shipping_rate_data: { type: "fixed_amount", fixed_amount: { amount: 0, currency: PRODUCT.currency }, display_name: "Free US shipping", delivery_estimate: { minimum: { unit: "business_day", value: 7 }, maximum: { unit: "business_day", value: 12 } } } }],
      line_items: [{
        quantity: 1,
        price_data: {
          currency: PRODUCT.currency,
          unit_amount: PRODUCT.price,
          product_data: {
            name: PRODUCT.name,
            description: `${style === "fitted" ? "Fitted" : "Unisex"} / ${size} · ${timestamp}`,
            metadata: { style, size, timestamp: String(timestamp) },
          },
        },
      }],
      metadata: { style, size, timestamp: String(timestamp), fulfillment_version: "1" },
      payment_intent_data: { metadata: { product: "timestamp-tee", style, size, timestamp: String(timestamp) } },
      phone_number_collection: { enabled: true },
      allow_promotion_codes: false,
      success_url: `${origin}/order?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?checkout=cancelled`,
      submit_type: "pay",
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("checkout_session_error", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Checkout is temporarily unavailable. Please try again." }, { status: 500 });
  }
}
