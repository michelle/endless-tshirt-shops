import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getBaseUrl } from "@/lib/base-url";
import {
  CURRENCY,
  PRICE_CENTS,
  SHIPPING_COUNTRIES,
  STYLES,
  isShirtSize,
  isShirtStyle,
} from "@/lib/catalog";

export const runtime = "nodejs";

// The moment you press "Buy now" is the moment printed on your shirt. The
// client sends its clock reading; we accept it if it's within a small skew of
// server time, otherwise we fall back to the server clock.
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

export async function POST(req: NextRequest) {
  let body: { style?: unknown; size?: unknown; ts?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const style = isShirtStyle(body.style) ? body.style : null;
  const size = isShirtSize(body.size) ? body.size : null;
  if (!style || !size) {
    return NextResponse.json(
      { error: "style must be fitted|unisex and size must be S|M|L|XL" },
      { status: 400 }
    );
  }

  const now = Date.now();
  const clientTs = typeof body.ts === "number" ? Math.floor(body.ts) : NaN;
  const ts =
    Number.isFinite(clientTs) && Math.abs(clientTs - now) <= MAX_CLOCK_SKEW_MS
      ? clientTs
      : now;

  const base = getBaseUrl();
  const stripe = getStripe();

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: CURRENCY,
            unit_amount: PRICE_CENTS,
            product_data: {
              name: `The datetime shirt — ${ts}`,
              description: `${STYLES[style].label} (${STYLES[style].garment}), size ${size}, black. Printed with the exact millisecond you bought it: ${ts}.`,
              images: [`${base}/api/artwork?ts=${ts}&variant=preview`],
            },
          },
        },
      ],
      shipping_address_collection: {
        allowed_countries: [...SHIPPING_COUNTRIES],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            display_name: "📦 Free shipping!",
            type: "fixed_amount",
            fixed_amount: { amount: 0, currency: CURRENCY },
            delivery_estimate: {
              minimum: { unit: "business_day", value: 5 },
              maximum: { unit: "business_day", value: 10 },
            },
          },
        },
      ],
      metadata: { ts: String(ts), style, size },
      payment_intent_data: {
        description: `A datetime shirt (${ts})`,
        metadata: { ts: String(ts), style, size },
      },
      success_url: `${base}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/`,
    });

    return NextResponse.json({ url: session.url, ts });
  } catch (err) {
    console.error("[checkout] failed to create session", err);
    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 500 }
    );
  }
}
