import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import {
  CURRENCY,
  PRICE_CENTS,
  SHIPPING_COUNTRIES,
  STYLES,
  SIZES,
  isSizeId,
  isStyleId,
} from "@/lib/products";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { style, size, ts } = (body ?? {}) as {
    style?: unknown;
    size?: unknown;
    ts?: unknown;
  };

  if (!isStyleId(style)) {
    return NextResponse.json({ error: "Invalid style" }, { status: 400 });
  }
  if (!isSizeId(size)) {
    return NextResponse.json({ error: "Invalid size" }, { status: 400 });
  }
  const timestamp = Number(ts);
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return NextResponse.json({ error: "Invalid timestamp" }, { status: 400 });
  }
  // The design is a snapshot of "now" — reject anything wildly in the past
  // or future, which would indicate a tampered request rather than a real
  // add-to-cart click.
  if (Math.abs(Date.now() - timestamp) > 1000 * 60 * 60) {
    return NextResponse.json({ error: "Timestamp out of range" }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  const artworkUrl = `${origin}/api/artwork?ts=${timestamp}&style=${style}`;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: CURRENCY,
          unit_amount: PRICE_CENTS,
          product_data: {
            name: `datetime.store tee — ${STYLES[style].label}, ${SIZES[size].label}`,
            description: `${STYLES[style].description}. Printed with the exact millisecond you bought it: ${timestamp}.`,
            images: [artworkUrl],
            metadata: { style, size, ts: String(timestamp) },
          },
        },
      },
    ],
    shipping_address_collection: {
      allowed_countries: [...SHIPPING_COUNTRIES],
    },
    metadata: {
      style,
      size,
      ts: String(timestamp),
    },
    payment_intent_data: {
      metadata: {
        style,
        size,
        ts: String(timestamp),
      },
    },
    success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?canceled=1`,
  });

  return NextResponse.json({ url: session.url });
}
