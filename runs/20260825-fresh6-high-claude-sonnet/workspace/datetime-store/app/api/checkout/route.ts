import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import {
  DEFAULT_SIZE,
  DEFAULT_STYLE,
  PRICE_USD_CENTS,
  SHIP_TO_COUNTRIES,
  STYLES,
  isValidSize,
  isValidStyle,
} from "@/lib/products";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { style: rawStyle, size: rawSize } = (body ?? {}) as {
    style?: string;
    size?: string;
  };

  const style = isValidStyle(rawStyle ?? "") ? (rawStyle as "unisex" | "fitted") : DEFAULT_STYLE;
  const size = isValidSize(style, rawSize ?? "") ? (rawSize as string) : DEFAULT_SIZE;

  const timestampMs = Date.now();
  const origin = req.headers.get("origin") ?? new URL(req.url).origin;
  const config = STYLES[style];

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: PRICE_USD_CENTS,
            product_data: {
              name: `datetime.store — ${config.label} tee, size ${size.toUpperCase()}`,
              description: `${config.description}. Printed with the exact moment you complete checkout.`,
              images: [`${origin}/api/artwork/${timestampMs}`],
            },
          },
          quantity: 1,
        },
      ],
      shipping_address_collection: {
        allowed_countries: SHIP_TO_COUNTRIES,
      },
      metadata: {
        style,
        size,
        timestampMs: String(timestampMs),
      },
      payment_intent_data: {
        metadata: {
          style,
          size,
          timestampMs: String(timestampMs),
        },
      },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("checkout session creation failed", err);
    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 500 }
    );
  }
}
