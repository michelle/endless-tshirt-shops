import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import {
  CURRENCY,
  PRICE_CENTS,
  STYLES,
  isShirtSize,
  isShirtStyle,
} from "@/lib/shirt";

export const runtime = "nodejs";

// Countries Prodigi can ship a Gildan tee to (kept in sync with the
// "shipsTo" list Prodigi returns for GLOBAL-TEE-GIL-64000/64000L in the US
// print-provider network). Trimmed to a sane, commonly-supported subset.
const ALLOWED_COUNTRIES = [
  "US",
  "CA",
  "GB",
  "AU",
  "NZ",
  "DE",
  "FR",
  "ES",
  "IT",
  "NL",
  "IE",
  "SE",
  "NO",
  "DK",
  "FI",
  "AT",
  "BE",
  "CH",
  "PT",
  "JP",
] as const;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { style, size, ts } = (body ?? {}) as {
    style?: unknown;
    size?: unknown;
    ts?: unknown;
  };

  if (!isShirtStyle(style)) {
    return NextResponse.json({ error: "Invalid style" }, { status: 400 });
  }
  if (!isShirtSize(size)) {
    return NextResponse.json({ error: "Invalid size" }, { status: 400 });
  }
  const timestamp = Number(ts);
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > 60_000) {
    return NextResponse.json({ error: "Invalid or stale timestamp" }, { status: 400 });
  }

  const origin = req.nextUrl.origin;
  const artworkUrl = `${origin}/api/artwork?ts=${timestamp}&style=${style}`;

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: CURRENCY,
            unit_amount: PRICE_CENTS,
            product_data: {
              name: `datetime.store tee — ${STYLES[style].label}, size ${size}`,
              description:
                "A t-shirt printed with the exact moment you complete this purchase.",
              images: [artworkUrl],
              metadata: { style, size, ts: String(timestamp) },
            },
          },
        },
      ],
      shipping_address_collection: {
        allowed_countries: [...ALLOWED_COUNTRIES],
      },
      phone_number_collection: { enabled: true },
      metadata: {
        style,
        size,
        ts: String(timestamp),
        artworkUrl,
      },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancel`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[checkout] failed to create session", err);
    return NextResponse.json(
      { error: "Could not start checkout" },
      { status: 500 }
    );
  }
}
