import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import {
  ALLOWED_SHIP_COUNTRIES,
  CURRENCY,
  isShirtColor,
  isShirtSize,
  isShirtStyle,
  PRICE_USD_CENTS,
  productName,
} from "@/lib/product";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || !isShirtStyle(body.style) || !isShirtSize(body.size) || !isShirtColor(body.color)) {
    return NextResponse.json({ error: "Invalid style, size, or color." }, { status: 400 });
  }

  const { style, size, color } = body;
  const origin = new URL(request.url).origin;

  try {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      submit_type: "pay",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: CURRENCY,
            unit_amount: PRICE_USD_CENTS,
            product_data: {
              name: productName(style, size, color),
              description:
                "Printed the instant your payment is confirmed, with the exact date, time, and millisecond.",
            },
          },
        },
      ],
      shipping_address_collection: {
        allowed_countries: [...ALLOWED_SHIP_COUNTRIES],
      },
      phone_number_collection: { enabled: true },
      metadata: { style, size, color },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancel`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Failed to create checkout session", err);
    return NextResponse.json({ error: "Could not start checkout." }, { status: 500 });
  }
}
