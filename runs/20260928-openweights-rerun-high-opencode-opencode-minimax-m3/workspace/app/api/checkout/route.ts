// Create a Stripe Checkout Session for the customer's design. We don't need
// to render or upload anything yet - the design and the Prodigi asset URL
// live in metadata and are read back inside the webhook after payment.
//
// POST /api/checkout
// body: { date, lat, lon, place?, title, shirt: { color, size } }

import { NextResponse } from "next/server";
import type Stripe from "stripe";

import {
  PRICE_CENTS,
  designToStripeMetadata,
  parseDesign,
} from "@/lib/design";
import { stripe } from "@/lib/stripe";
import { publicBaseUrl } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Stripe expects a finite union of ISO codes for shipping_address_collection
// instead of a free-form string array; cast through `Stripe.AllowedCountry[]`
// so the SDK accepts the broader set Prodigi ships to.
const ALLOWED_COUNTRIES = [
  "US",
  "CA",
  "GB",
  "AU",
  "DE",
  "FR",
  "IT",
  "ES",
  "NL",
  "BE",
  "IE",
  "NZ",
  "JP",
  "SG",
  "HK",
  "SE",
  "NO",
  "DK",
  "FI",
  "PT",
  "AT",
  "CH",
] satisfies Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[];

export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const design = parseDesign(payload);
  if (!design) {
    return NextResponse.json({ error: "Bad design" }, { status: 400 });
  }

  try {
    const base = publicBaseUrl(req);
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      // We pre-name the line item so the customer sees exactly what they're
      // buying and Stripe's receipts mention the personalisation.
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: PRICE_CENTS,
            product_data: {
              name: "Personalised star-map t-shirt",
              description: `${design.title} · ${design.date} · ${
                design.place ?? `${design.lat.toFixed(2)}, ${design.lon.toFixed(2)}`
              } · ${design.shirt.color}, ${design.shirt.size.toUpperCase()}`,
            },
          },
        },
      ],
      // Stripe collects shipping on the hosted page and writes it into the
      // session so we can hand it off to Prodigi without re-asking.
      shipping_address_collection: { allowed_countries: ALLOWED_COUNTRIES },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: 0, currency: "usd" },
            display_name: "Standard worldwide shipping",
            delivery_estimate: {
              minimum: { unit: "business_day", value: 5 },
              maximum: { unit: "business_day", value: 12 },
            },
          },
        },
      ],
      // Soapdish: we want the customer's email so we can give them a real
      // confirmation if we ever add transactional email.
      customer_email: undefined,
      phone_number_collection: { enabled: false },
      metadata: designToStripeMetadata(design),
      success_url: `${base}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/?cancelled=1`,
      // Allow promotion codes so the storefront can run discount campaigns.
      allow_promotion_codes: true,
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
