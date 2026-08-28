import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import {
  CURRENCY,
  PRICE_CENTS,
  formatHumanDate,
  formatMs,
  isShirtSize,
  isShirtStyle,
} from "@/lib/shirt";

export const runtime = "nodejs";

function siteUrl(req: NextRequest) {
  return process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { style, size, timestampMs } = (body ?? {}) as {
    style?: unknown;
    size?: unknown;
    timestampMs?: unknown;
  };

  if (!isShirtStyle(style)) {
    return NextResponse.json({ error: "Invalid shirt style." }, { status: 400 });
  }
  if (!isShirtSize(size)) {
    return NextResponse.json({ error: "Invalid shirt size." }, { status: 400 });
  }
  if (typeof timestampMs !== "number" || !Number.isFinite(timestampMs)) {
    return NextResponse.json({ error: "Invalid timestamp." }, { status: 400 });
  }
  // Sanity check: the captured moment should be recent (within the last 5 minutes).
  if (Math.abs(Date.now() - timestampMs) > 5 * 60 * 1000) {
    return NextResponse.json(
      { error: "This moment has passed — refresh and try again." },
      { status: 400 },
    );
  }

  const origin = siteUrl(req);
  const artworkUrl = `${origin}/api/artwork?ts=${timestampMs}&style=${style}`;

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      submit_type: "pay",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: CURRENCY,
            unit_amount: PRICE_CENTS,
            product_data: {
              name: `datetime.store tee — ${style === "fitted" ? "Fitted" : "Unisex"}, size ${size}`,
              description: `Printed with the exact moment ${formatHumanDate(timestampMs)} (${formatMs(timestampMs)} ms since epoch).`,
              images: [artworkUrl],
            },
          },
        },
      ],
      shipping_address_collection: { allowed_countries: ["US"] },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: 0, currency: CURRENCY },
            display_name: "Free shipping",
            delivery_estimate: {
              minimum: { unit: "business_day", value: 5 },
              maximum: { unit: "business_day", value: 9 },
            },
          },
        },
      ],
      metadata: {
        product: "datetime-tee",
        style,
        size,
        timestampMs: String(timestampMs),
        artworkUrl,
      },
      payment_intent_data: {
        metadata: {
          product: "datetime-tee",
          style,
          size,
          timestampMs: String(timestampMs),
          artworkUrl,
        },
      },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?canceled=1`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("checkout session error", err);
    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 500 },
    );
  }
}
