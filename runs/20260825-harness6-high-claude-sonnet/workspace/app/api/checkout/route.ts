import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import {
  PRICE_USD_CENTS,
  SHIRT_STYLES,
  isShirtSize,
  isShirtStyle,
} from "@/lib/products";
import { ALLOWED_SHIPPING_COUNTRIES } from "@/lib/shipping";

export async function POST(req: NextRequest) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const body = payload as {
    style?: unknown;
    size?: unknown;
    date?: unknown;
    time?: unknown;
    tz?: unknown;
  };

  if (!isShirtStyle(body.style)) {
    return NextResponse.json({ error: "Invalid style" }, { status: 400 });
  }
  if (!isShirtSize(body.size)) {
    return NextResponse.json({ error: "Invalid size" }, { status: 400 });
  }
  const date = typeof body.date === "string" ? body.date.slice(0, 32) : "";
  const time = typeof body.time === "string" ? body.time.slice(0, 32) : "";
  const tz = typeof body.tz === "string" ? body.tz.slice(0, 32) : "UTC";
  if (!date || !time) {
    return NextResponse.json(
      { error: "Missing purchase timestamp" },
      { status: 400 },
    );
  }

  const style = SHIRT_STYLES[body.style];
  const origin = req.nextUrl.origin;

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    submit_type: "pay",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: PRICE_USD_CENTS,
          product_data: {
            name: style.productName,
            description: `Size ${body.size} · printed with the exact moment you bought it (${date} ${time} ${tz})`,
            images: [
              `${origin}/api/artwork?date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}&tz=${encodeURIComponent(tz)}`,
            ],
          },
        },
      },
    ],
    shipping_address_collection: {
      allowed_countries: ALLOWED_SHIPPING_COUNTRIES,
    },
    shipping_options: [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: { amount: 0, currency: "usd" },
          display_name: "Free worldwide shipping",
          delivery_estimate: {
            minimum: { unit: "business_day", value: 5 },
            maximum: { unit: "business_day", value: 12 },
          },
        },
      },
    ],
    phone_number_collection: { enabled: false },
    custom_text: {
      submit: {
        message:
          "Your shirt freezes this exact timestamp the moment payment clears.",
      },
    },
    metadata: {
      style: body.style,
      size: body.size,
      date,
      time,
      tz,
    },
    success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?canceled=1`,
  });

  return NextResponse.json({ url: session.url });
}
