import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  PRICE_CENTS,
  getRequestOrigin,
  getStripe,
  isShirtFit,
  isShirtSize,
  isTimestamp,
} from "@/lib/store";

export const runtime = "nodejs";

const ALLOWED_COUNTRIES: Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[] = [
  "US", "CA", "GB", "AU", "NZ", "IE", "FR", "DE", "ES", "IT", "NL",
  "BE", "AT", "DK", "FI", "NO", "SE", "CH", "PT", "PL", "CZ", "GR",
  "HU", "RO", "BG", "HR", "SI", "SK", "EE", "LV", "LT", "LU", "MT",
  "CY", "JP", "SG", "HK", "KR", "MX", "BR", "ZA", "AE",
];

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      fit?: unknown;
      size?: unknown;
      timestamp?: unknown;
    };

    if (
      !isShirtFit(body.fit) ||
      !isShirtSize(body.size) ||
      !isTimestamp(body.timestamp)
    ) {
      return NextResponse.json(
        { error: "Please choose a valid fit and size, then try again." },
        { status: 400 },
      );
    }

    const origin = getRequestOrigin(request);
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_creation: "always",
      billing_address_collection: "auto",
      phone_number_collection: { enabled: true },
      shipping_address_collection: { allowed_countries: ALLOWED_COUNTRIES },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            display_name: "Free standard shipping",
            fixed_amount: { amount: 0, currency: "usd" },
            delivery_estimate: {
              minimum: { unit: "business_day", value: 5 },
              maximum: { unit: "business_day", value: 12 },
            },
          },
        },
      ],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: PRICE_CENTS,
            product_data: {
              name: "The datetime shirt",
              description: `${body.timestamp} · ${body.fit} fit · size ${body.size}`,
            },
          },
        },
      ],
      metadata: {
        fit: body.fit,
        size: body.size,
        timestamp: body.timestamp,
        siteOrigin: origin,
      },
      payment_intent_data: {
        description: `datetime.store shirt — ${body.timestamp}`,
        metadata: {
          fit: body.fit,
          size: body.size,
          timestamp: body.timestamp,
        },
      },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?canceled=1`,
      submit_type: "pay",
    });

    if (!session.url) throw new Error("Stripe did not return a checkout URL.");
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[checkout]", error);
    return NextResponse.json(
      { error: "Secure checkout is temporarily unavailable. Please try again." },
      { status: 500 },
    );
  }
}
