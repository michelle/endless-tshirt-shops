import { NextRequest, NextResponse } from "next/server";
import {
  CURRENCY,
  SHIRT_PRICE_CENTS,
  SHIP_COUNTRIES,
  SHIPPING_PRICE_CENTS,
  SIZE_LABELS,
  SizeId,
  getShirt,
} from "@/lib/config";
import { encodeDesign, parseDesignInput } from "@/lib/design";
import { getStripe } from "@/lib/stripe";
import type Stripe from "stripe";

export const runtime = "nodejs";

/**
 * POST /api/checkout
 * Body: { name, born, caption?, shirt, size, accent, qty }
 *
 * Validates the design server-side, freezes the timeline at today (UTC),
 * and creates a Stripe Checkout Session. Fulfilment happens only after
 * payment — never here.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const design = parseDesignInput(body);
  if (!design) {
    return NextResponse.json(
      { error: "invalid design — check name, birth date, colour, size, accent and quantity" },
      { status: 400 }
    );
  }

  const shirt = getShirt(design.shirt)!;
  const origin = process.env.SITE_BASE_URL?.replace(/\/$/, "") || req.nextUrl.origin;

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: CURRENCY,
            product_data: {
              name: "4000 Fridays — Life-Calendar Tee",
              description: `${shirt.label} · size ${SIZE_LABELS[design.size as SizeId]} · ${design.name.toUpperCase()} · born ${design.born} · one dot per week lived`,
            },
            unit_amount: SHIRT_PRICE_CENTS,
          },
          quantity: design.qty,
        },
      ],
      shipping_address_collection: {
        allowed_countries: SHIP_COUNTRIES as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: SHIPPING_PRICE_CENTS, currency: CURRENCY },
            display_name: "Standard shipping (worldwide)",
          },
        },
      ],
      phone_number_collection: { enabled: true },
      metadata: {
        design: JSON.stringify(encodeDesign(design)),
      },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/#make`,
    });

    if (!session.url) {
      throw new Error("Stripe returned no checkout URL");
    }
    return NextResponse.json({ url: session.url });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "checkout failed" },
      { status: 500 }
    );
  }
}
