import { NextRequest, NextResponse } from "next/server";
import { checkoutSchema } from "@/lib/validation";
import { getShirt, PRICE_CENTS } from "@/lib/catalog";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const parsed = checkoutSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Please choose a valid fit and size." }, { status: 400 });

    const { timestamp, style, size } = parsed.data;
    const origin = request.nextUrl.origin;
    const shirt = getShirt(style);
    const checkout = await getStripe().checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_creation: "always",
      billing_address_collection: "auto",
      shipping_address_collection: { allowed_countries: ["US", "CA", "GB", "AU", "NZ"] },
      shipping_options: [{
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: { amount: 0, currency: "usd" },
          display_name: "Free shipping",
          delivery_estimate: {
            minimum: { unit: "business_day", value: 5 },
            maximum: { unit: "business_day", value: 12 },
          },
        },
      }],
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: PRICE_CENTS,
          product_data: {
            name: "The datetime tee",
            description: `${shirt.label} · ${size} · timestamp ${timestamp}`,
            metadata: { timestamp: String(timestamp), style, size },
          },
        },
      }],
      metadata: { timestamp: String(timestamp), style, size, origin },
      payment_intent_data: { metadata: { timestamp: String(timestamp), style, size } },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?checkout=cancelled`,
      submit_type: "pay",
    }, { idempotencyKey: `checkout-${timestamp}-${style}-${size}` });

    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    console.error("Checkout creation failed", error);
    return NextResponse.json({ error: "Checkout is temporarily unavailable. Please try again." }, { status: 500 });
  }
}
