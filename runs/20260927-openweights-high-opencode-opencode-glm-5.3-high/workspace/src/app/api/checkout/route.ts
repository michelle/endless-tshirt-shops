import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { validateSpec, specPhaseShort } from "@/lib/params";
import { GARMENTS, CURRENCY, SHIP_TO_COUNTRIES, unitPriceCents, SIZE_LABELS, type Size } from "@/lib/products";
import { artworkUrl } from "@/lib/signed";
import { originFor } from "@/lib/origin";
import type Stripe from "stripe";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { spec, issues } = validateSpec(body);
  if (!spec) {
    return NextResponse.json({ error: "Validation failed.", issues }, { status: 400 });
  }

  const garment = GARMENTS.find((g) => g.id === spec.garment)!;
  const origin = originFor(req);
  const unitAmount = unitPriceCents(spec.size);
  const total = unitAmount * spec.quantity;

  const design = {
    date: spec.date,
    time: spec.time,
    hemisphere: spec.hemisphere,
    garment: spec.garment,
    line: spec.line,
  };
  const phase = specPhaseShort(design);
  const description =
    `${specPhaseShort(design)} · ${garment.name} · ${SIZE_LABELS[spec.size as Size]}` +
    (spec.line ? ` · “${spec.line}”` : "");

  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    line_items: [
      {
        quantity: spec.quantity,
        price_data: {
          currency: CURRENCY,
          unit_amount: unitAmount,
          product_data: {
            name: "Under This Moon — Custom Moonphase Tee",
            description,
            images: [artworkUrl(design, origin)],
          },
        },
      },
    ],
    shipping_address_collection: { allowed_countries: SHIP_TO_COUNTRIES as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[] },
    phone_number_collection: { enabled: true },
    metadata: {
      order_params: JSON.stringify(spec),
      phase,
    },
    payment_intent_data: {
      metadata: {
        order_params: JSON.stringify(spec),
        source: "under-this-moon",
      },
      description,
    },
    success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?cancelled=1`,
    expires_at: Math.floor(Date.now() / 1000) + 23 * 3600,
  };

  try {
    const session = await stripe().checkout.sessions.create(params);
    return NextResponse.json({
      id: session.id,
      url: session.url,
      total,
      currency: CURRENCY,
    });
  } catch (err) {
    console.error("checkout session creation failed:", err);
    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 500 }
    );
  }
}
