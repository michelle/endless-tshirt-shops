import { NextResponse } from "next/server";
import { z } from "zod";
import { PRODUCT } from "@/lib/product";
import { getOrigin } from "@/lib/origin";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

const inputSchema = z.object({
  fit: z.enum(["fitted", "unisex"]),
  size: z.enum(["S", "M", "L", "XL"]),
  timestamp: z.number().int().safe().refine((value) => Math.abs(Date.now() - value) < 5 * 60_000, "Timestamp must be current"),
});

export async function POST(request: Request) {
  try {
    const input = inputSchema.parse(await request.json());
    const stripe = getStripe();
    const origin = await getOrigin();
    const readableFit = input.fit === "fitted" ? "Fitted" : "Unisex";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_creation: "always",
      billing_address_collection: "auto",
      shipping_address_collection: { allowed_countries: ["US"] },
      shipping_options: [{
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: { amount: 0, currency: PRODUCT.currency },
          display_name: "Free US shipping",
          delivery_estimate: {
            minimum: { unit: "business_day", value: 5 },
            maximum: { unit: "business_day", value: 9 },
          },
        },
      }],
      line_items: [{
        quantity: 1,
        price_data: {
          currency: PRODUCT.currency,
          unit_amount: PRODUCT.price,
          product_data: {
            name: PRODUCT.name,
            description: `${readableFit} / ${input.size} · ${input.timestamp}`,
            metadata: { fit: input.fit, size: input.size },
          },
        },
      }],
      payment_intent_data: {
        description: `datetime.store tee · ${input.timestamp}`,
        metadata: { fit: input.fit, size: input.size, timestamp: String(input.timestamp) },
      },
      metadata: { fit: input.fit, size: input.size, timestamp: String(input.timestamp), product_version: "timestamp-tee-v1" },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?checkout=cancelled#buy`,
      submit_type: "pay",
      locale: "auto",
    }, { idempotencyKey: `checkout-${input.timestamp}-${input.fit}-${input.size}` });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout creation failed", error);
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Please choose a valid shirt and try again." }, { status: 400 });
    return NextResponse.json({ error: "Checkout is temporarily unavailable. Please try again." }, { status: 500 });
  }
}
