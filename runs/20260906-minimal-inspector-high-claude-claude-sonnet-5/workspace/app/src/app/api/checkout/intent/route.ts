import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import {
  CURRENCY,
  PRICE_USD_CENTS,
  isShirtSize,
  isShirtStyle,
} from "@/lib/products";

// Step 1 of checkout: mint a PaymentIntent for the (fixed-price) shirt the
// shopper configured, tagging it with the exact artwork/style/size so the
// webhook can build a Prodigi order once payment succeeds.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { style, size, timestamp } = body ?? {};

  if (!isShirtStyle(style)) {
    return NextResponse.json({ error: "Invalid style" }, { status: 400 });
  }
  if (!isShirtSize(size)) {
    return NextResponse.json({ error: "Invalid size" }, { status: 400 });
  }
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || ts <= 0) {
    return NextResponse.json({ error: "Invalid timestamp" }, { status: 400 });
  }

  // Scoped to card only: this is a $22.50 impulse buy, not the kind of
  // purchase anyone finances with Klarna or pays via bank debit, and it
  // keeps the checkout surface (and its edge cases) small.
  const paymentIntent = await stripe.paymentIntents.create({
    amount: PRICE_USD_CENTS,
    currency: CURRENCY,
    payment_method_types: ["card"],
    metadata: {
      style,
      size,
      timestamp: String(ts),
    },
    description: `datetime.store shirt (${style}, ${size}) — ${ts}`,
  });

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  });
}
