import { NextResponse } from "next/server";
import Stripe from "stripe";
import { describeTimestamp } from "@/lib/artwork";
import { parseCheckoutRequest, ValidationError } from "@/lib/checkout-request";
import { META } from "@/lib/fulfill";
import { CURRENCY, PRICE_CENTS, STYLE_INFO } from "@/lib/products";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

/**
 * POST /api/checkout
 * Body: { style, size, timestamp, email, shipping: { name, phone?, address } }
 * Creates the PaymentIntent for one shirt and returns its client secret. The
 * PaymentIntent carries everything needed to fulfil the order in metadata.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const order = parseCheckoutRequest(body);
    const intent = await stripe().paymentIntents.create({
      amount: PRICE_CENTS,
      currency: CURRENCY,
      automatic_payment_methods: { enabled: true },
      receipt_email: order.email,
      description: `datetime.store tee (${STYLE_INFO[order.style].label} ${order.size}) printed with ${order.timestamp}`,
      statement_descriptor_suffix: "DATETIME",
      // Shipping is attached by the browser when it confirms the payment (from
      // the Address Element or the wallet sheet). Setting it here with the
      // secret key would block the publishable key from doing so. The address
      // is still validated above, and checked again at fulfilment.
      metadata: {
        [META.style]: order.style,
        [META.size]: order.size,
        [META.timestamp]: String(order.timestamp),
        datetime_iso: describeTimestamp(order.timestamp),
        prodigi_sku: STYLE_INFO[order.style].sku,
      },
    });
    return NextResponse.json({ clientSecret: intent.client_secret, paymentIntentId: intent.id });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof Stripe.errors.StripeError) {
      console.error("[checkout] Stripe error", err.type, err.message);
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    console.error("[checkout] unexpected error", err);
    return NextResponse.json({ error: "Something went wrong creating your order" }, { status: 500 });
  }
}
