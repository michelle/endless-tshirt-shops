import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

const orderSchema = z.object({
  fit: z.enum(["fitted", "unisex"]),
  size: z.enum(["S", "M", "L", "XL"]),
  timestamp: z.number().int().min(1_500_000_000_000).max(9_999_999_999_999),
});

export async function POST(request: NextRequest) {
  try {
    const order = orderSchema.parse(await request.json());
    const stripe = getStripe();
    const origin = request.nextUrl.origin;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?cancelled=1`,
      customer_creation: "always",
      billing_address_collection: "auto",
      shipping_address_collection: { allowed_countries: ["US", "CA", "GB", "AU", "NZ", "DE", "FR", "IT", "ES", "NL", "IE", "SE", "DK", "NO", "FI", "BE", "AT", "PT", "PL", "CH"] },
      phone_number_collection: { enabled: true },
      shipping_options: [{ shipping_rate_data: { type: "fixed_amount", fixed_amount: { amount: 0, currency: "usd" }, display_name: "Free tracked shipping", delivery_estimate: { minimum: { unit: "business_day", value: 5 }, maximum: { unit: "business_day", value: 10 } } } }],
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: 2250,
          product_data: {
            name: `${order.fit === "fitted" ? "Fitted" : "Unisex"} timestamp tee — ${order.size}`,
            description: `One-of-one black t-shirt · ${order.timestamp}`,
            metadata: { fit: order.fit, size: order.size.toLowerCase(), timestamp: String(order.timestamp) },
          },
        },
      }],
      metadata: { fit: order.fit, size: order.size.toLowerCase(), timestamp: String(order.timestamp), origin },
      payment_intent_data: { description: `datetime.store timestamp tee ${order.timestamp}`, metadata: { fit: order.fit, size: order.size.toLowerCase(), timestamp: String(order.timestamp) } },
    }, { idempotencyKey: `checkout-${order.fit}-${order.size}-${order.timestamp}` });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof z.ZodError ? "Please choose a valid fit and size." : error instanceof Error ? error.message : "Unable to start checkout.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
