import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { canonicalOrigin } from "@/lib/env";
import {
  checkoutInputSchema,
  formatTimestamp,
  getCurrency,
  getPriceCents,
  shirtConfig,
} from "@/lib/products";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

const allowedCountries: Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[] = [
  "US",
];

export async function POST(request: NextRequest) {
  try {
    const json: unknown = await request.json();
    const parsed = checkoutInputSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Choose a valid shirt style and size." }, { status: 400 });
    }

    const { style, size, timestamp } = parsed.data;
    const origin = canonicalOrigin(request.nextUrl.origin);
    const price = getPriceCents();
    const currency = getCurrency();
    const metadata = { style, size, timestamp };

    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      customer_creation: "always",
      billing_address_collection: "auto",
      shipping_address_collection: { allowed_countries: allowedCountries },
      phone_number_collection: { enabled: true },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: price,
            product_data: {
              name: `${shirtConfig[style].label} datetime shirt · ${size}`,
              description: `Your exact moment: ${timestamp} (${formatTimestamp(timestamp)})`,
              metadata,
            },
          },
        },
      ],
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: 0, currency },
            display_name: "Free tracked shipping",
            delivery_estimate: {
              minimum: { unit: "business_day", value: 5 },
              maximum: { unit: "business_day", value: 10 },
            },
          },
        },
      ],
      metadata,
      payment_intent_data: { metadata },
      success_url: `${origin}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?canceled=1`,
      submit_type: "pay",
      custom_text: {
        shipping_address: {
          message: "Printed on demand. Double-check your address before placing the order.",
        },
        submit: { message: "Your timestamp is frozen when checkout begins." },
      },
    });

    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout session creation failed", error);
    return NextResponse.json(
      { error: "Checkout is temporarily unavailable. Please try again." },
      { status: 500 },
    );
  }
}
