import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import {
  LIST_PRICE_CENTS,
  PRICE_CENTS,
  STYLE_LABELS,
  isShirtSize,
  isShirtStyle,
} from "@/lib/products";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { style, size, timestamp } = body;

  if (!isShirtStyle(style) || !isShirtSize(size)) {
    return NextResponse.json({ error: "Invalid style or size." }, { status: 400 });
  }

  const ts = Number(timestamp);
  // Reject timestamps far from "now" -- the artwork must reflect a real
  // purchase moment, not an arbitrary client-supplied value.
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > 10 * 60 * 1000) {
    return NextResponse.json({ error: "Invalid timestamp." }, { status: 400 });
  }

  const origin = req.headers.get("origin") || new URL(req.url).origin;
  const metadata = { style, size, timestamp: String(ts) };
  const artworkUrl = `${origin}/api/artwork?ts=${ts}`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      submit_type: "pay",
      shipping_address_collection: { allowed_countries: ["US"] },
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: PRICE_CENTS,
            product_data: {
              name: `datetime.store tee — ${STYLE_LABELS[style]}, size ${size}`,
              description: `Printed live at checkout with the Unix timestamp ${ts}. List price $${(
                LIST_PRICE_CENTS / 100
              ).toFixed(2)}.`,
              images: [artworkUrl],
            },
          },
          quantity: 1,
        },
      ],
      payment_intent_data: { metadata },
      metadata,
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[checkout] failed to create session", err);
    return NextResponse.json({ error: "Could not start checkout." }, { status: 502 });
  }
}
