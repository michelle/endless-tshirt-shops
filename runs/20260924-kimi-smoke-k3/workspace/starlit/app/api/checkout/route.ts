// Creates a checkout session for a shirt configuration.
// - If STRIPE_SECRET_KEY is set: real Stripe Checkout (card payment,
//   shipping collection, webhook-driven fulfillment).
// - Otherwise: the built-in sandbox gateway at /pay, which simulates a
//   card charge and fulfills on success. Same contract: Prodigi only
//   ever sees an order after payment succeeds.

import { NextRequest, NextResponse } from "next/server";
import {
  appUrl,
  newRef,
  signPayload,
  toMetadata,
  validateDesignInput,
  PRICE_SHIRT_CENTS,
  PRICE_SHIPPING_CENTS,
  CURRENCY,
  type OrderConfig,
} from "@/lib/order";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const design = validateDesignInput(body);
  if (!design) {
    return NextResponse.json({ error: "invalid shirt configuration" }, { status: 400 });
  }
  const cfg: OrderConfig = { ...design, ref: newRef() };

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (stripeKey) {
    try {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(stripeKey);
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: CURRENCY,
              unit_amount: PRICE_SHIRT_CENTS,
              product_data: {
                name: `Custom star-map tee — ${design.color}, ${design.size.toUpperCase()}`,
                description: `"${design.title}" · ${design.place} · ${design.date} ${design.time}`,
              },
            },
          },
        ],
        shipping_options: [
          {
            shipping_rate_data: {
              type: "fixed_amount",
              fixed_amount: { amount: PRICE_SHIPPING_CENTS, currency: CURRENCY },
              display_name: "Standard tracked shipping",
              delivery_estimate: {
                minimum: { unit: "business_day", value: 5 },
                maximum: { unit: "business_day", value: 10 },
              },
            },
          },
        ],
        shipping_address_collection: {
          allowed_countries: ["US", "CA", "GB", "IE", "FR", "DE", "ES", "IT", "NL", "AU", "NZ", "SE", "NO", "DK", "BE", "AT", "CH", "PT", "PL", "JP"],
        },
        metadata: toMetadata(cfg),
        success_url: `${appUrl()}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl()}/?cancelled=1`,
      });
      return NextResponse.json({ url: session.url, provider: "stripe" });
    } catch (e) {
      return NextResponse.json(
        { error: "stripe checkout failed", detail: String(e) },
        { status: 502 }
      );
    }
  }

  // Sandbox gateway
  const token = signPayload(cfg);
  return NextResponse.json({
    url: `${appUrl()}/pay?p=${encodeURIComponent(token)}`,
    provider: "sandbox",
  });
}
