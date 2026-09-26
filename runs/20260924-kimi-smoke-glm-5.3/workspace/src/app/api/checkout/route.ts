import { NextRequest, NextResponse } from "next/server";
import { stripeClient } from "@/server/stripe";
import { encodeSpec, specNumber, validateSpec } from "@/lib/spec";
import { priceCents, type Size } from "@/lib/products";
import { printUrl } from "@/server/signing";

export const runtime = "nodejs";

/**
 * Create a Stripe Checkout Session for one custom shirt.
 * The price is recomputed server-side from the size — the client amount is
 * never trusted. The validated design spec travels in session metadata, and
 * fulfillment only happens from the signed webhook.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const res = validateSpec((body as any)?.spec);
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: 400 });
  }
  const spec = res.spec;
  const encoded = encodeSpec(spec);
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;

  const name = `Skyborn — № ${specNumber(spec)}`;
  const description =
    `One-of-one star chart tee · ${spec.size.toUpperCase()} · ${spec.color} · ` +
    `${spec.place} · printed only once`;

  try {
    const stripe = stripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: priceCents(spec.size),
            product_data: {
              name,
              description,
              images: [printUrl(origin, encoded) + "&w=620"],
              metadata: { number: specNumber(spec) },
            },
          },
        },
      ],
      shipping_address_collection: { allowed_countries: ["US"] },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: 0, currency: "usd" },
            display_name: "Standard US shipping",
            delivery_estimate: {
              minimum: { unit: "business_day", value: 4 },
              maximum: { unit: "business_day", value: 8 },
            },
          },
        },
      ],
      // Note: phone_number_collection deliberately off — couriers get the
      // customer email; revisit with a manual review queue before launch.
      metadata: { spec: encoded, number: specNumber(spec) },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?cancelled=1#configure`,
    });

    return NextResponse.json({ url: session.url, id: session.id });
  } catch (e) {
    console.error("checkout session failed", e);
    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 500 },
    );
  }
}
