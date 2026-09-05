import { NextResponse } from "next/server";
import { stripe, stripeConfigured } from "@/lib/stripe";
import {
  COLOR_INFO,
  CURRENCY,
  PRICE_CENTS,
  SHIP_TO_COUNTRIES,
  STYLE_INFO,
  isColor,
  isSize,
  isStyle,
} from "@/lib/catalog";
import { previewUrl, siteUrl } from "@/lib/site";
import { reconcileMoment, utcString } from "@/lib/time";

export const runtime = "nodejs";

/**
 * POST /api/checkout
 * body: { ts: number, style: 'unisex'|'fitted', color: 'black'|'white', size: 'S'..'2XL' }
 * → { clientSecret, ts }
 *
 * Creates an embedded Stripe Checkout Session for exactly one moment.
 */
export async function POST(req: Request) {
  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured on this deployment." }, { status: 503 });
  }

  let body: { ts?: unknown; style?: unknown; color?: unknown; size?: unknown; tz?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }

  const style = isStyle(body.style) ? body.style : null;
  const color = isColor(body.color) ? body.color : null;
  const size = isSize(body.size) ? body.size : null;
  if (!style || !color || !size) {
    return NextResponse.json({ error: "Pick a style, a colour and a size." }, { status: 400 });
  }

  const ts = reconcileMoment(body.ts);
  const base = siteUrl(new URL(req.url).origin);
  const tz = typeof body.tz === "string" && body.tz.length < 64 ? body.tz : "";
  const isPublic = /^https:\/\//.test(base);

  const productName = `Moment ${ts}`;
  const description = `${STYLE_INFO[style].label} tee · ${COLOR_INFO[color].label} · ${size}. Printed with ${utcString(ts)} — the exact millisecond you froze.`;

  const session = await stripe().checkout.sessions.create({
    ui_mode: "embedded",
    mode: "payment",
    return_url: `${base}/thanks?session_id={CHECKOUT_SESSION_ID}`,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: CURRENCY,
          unit_amount: PRICE_CENTS,
          product_data: {
            name: productName,
            description,
            // Stripe needs a public URL for images; skip on localhost.
            ...(isPublic ? { images: [previewUrl(base, ts, color)] } : {}),
            metadata: { ts: String(ts), style, color, size },
          },
        },
      },
    ],
    shipping_address_collection: { allowed_countries: [...SHIP_TO_COUNTRIES] },
    shipping_options: [
      {
        shipping_rate_data: {
          display_name: "Free shipping, anywhere we reach",
          type: "fixed_amount",
          fixed_amount: { amount: 0, currency: CURRENCY },
          delivery_estimate: {
            minimum: { unit: "business_day", value: 5 },
            maximum: { unit: "business_day", value: 14 },
          },
        },
      },
    ],
    phone_number_collection: { enabled: false },
    metadata: { ts: String(ts), style, color, size, tz },
    payment_intent_data: {
      description: `datetime.store — ${productName} (${STYLE_INFO[style].label}, ${COLOR_INFO[color].label}, ${size})`,
      metadata: { ts: String(ts), style, color, size },
    },
  });

  return NextResponse.json({ clientSecret: session.client_secret, sessionId: session.id, ts });
}
