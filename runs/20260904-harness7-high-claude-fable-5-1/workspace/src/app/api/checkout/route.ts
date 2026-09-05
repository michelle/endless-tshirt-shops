import { NextResponse } from "next/server";
import {
  CURRENCY,
  PRICE_CENTS,
  checkoutRequestSchema,
  describeShirt,
  timestampIsCurrent,
} from "@/lib/catalog";
import { stripe } from "@/lib/stripe";
import { artworkUrl } from "@/lib/artwork";
import { siteUrl } from "@/lib/env";

export const runtime = "nodejs";

/**
 * Start a purchase. The browser tells us which shirt and the exact millisecond
 * the customer clicked "Buy"; we create a PaymentIntent for the fixed price and
 * pin the shirt spec in its metadata so fulfilment can never disagree with
 * what was paid for.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { code: "bad_json", message: "Invalid JSON body" } }, { status: 400 });
  }
  const parsed = checkoutRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Pick a valid style, size and timestamp." } },
      { status: 400 },
    );
  }
  const { style, size, timestamp } = parsed.data;
  const now = Date.now();
  if (!timestampIsCurrent(timestamp, now)) {
    return NextResponse.json(
      {
        error: { code: "clock_skew", message: "Your clock looks out of sync; retrying with server time." },
        serverTime: now,
      },
      { status: 400 },
    );
  }

  try {
    const pi = await stripe().paymentIntents.create(
      {
        amount: PRICE_CENTS,
        currency: CURRENCY,
        automatic_payment_methods: { enabled: true },
        description: describeShirt(style, size, timestamp),
        statement_descriptor_suffix: "DATETIME",
        metadata: {
          style,
          size,
          timestamp: String(timestamp),
          artwork_url: artworkUrl(siteUrl(), style, timestamp),
        },
      },
      // Idempotent per (shirt, millisecond): a double click cannot create two intents.
      { idempotencyKey: `dts-${style}-${size}-${timestamp}` },
    );
    return NextResponse.json({
      paymentIntentId: pi.id,
      clientSecret: pi.client_secret,
      amount: pi.amount,
      currency: pi.currency,
    });
  } catch (err) {
    console.error("[checkout] failed to create PaymentIntent", err);
    return NextResponse.json(
      { error: { code: "stripe_error", message: "We couldn't start checkout. Please try again." } },
      { status: 502 },
    );
  }
}
