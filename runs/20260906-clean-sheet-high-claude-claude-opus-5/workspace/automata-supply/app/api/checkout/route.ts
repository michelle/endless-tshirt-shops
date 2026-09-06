import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, shippingOptions, SHIPPING_COUNTRIES, chunkItems } from "@/lib/stripe";
import { decodeLineItem, designTitle, designSubtitle, GARMENT_BY_ID, INKS, SIZES } from "@/lib/design";
import { priceFor, isCatalogDesign } from "@/lib/catalog";
import { siteOrigin, thumbUrl } from "@/lib/art";

export const runtime = "nodejs";

const MAX_ITEMS = 10;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const encoded = (body as { items?: unknown }).items;
  if (!Array.isArray(encoded) || encoded.length === 0) {
    return NextResponse.json({ error: "Your cart is empty" }, { status: 400 });
  }
  if (encoded.length > MAX_ITEMS) {
    return NextResponse.json(
      { error: `Orders are limited to ${MAX_ITEMS} distinct designs` },
      { status: 400 },
    );
  }

  const origin = siteOrigin();
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  const clean: string[] = [];

  for (const raw of encoded) {
    if (typeof raw !== "string") {
      return NextResponse.json({ error: "Invalid item in cart" }, { status: 400 });
    }
    const parsed = decodeLineItem(raw);
    if (!parsed) {
      return NextResponse.json({ error: "Invalid item in cart" }, { status: 400 });
    }
    const { design, size, garmentId, qty } = parsed;
    const garment = GARMENT_BY_ID[garmentId];

    // Price is recomputed here from the decoded design. Nothing the browser
    // sends about money is trusted.
    const unitAmount = priceFor(design, size);

    lineItems.push({
      quantity: qty,
      price_data: {
        currency: "usd",
        unit_amount: unitAmount,
        product_data: {
          name: `${designTitle(design)} — ${
            isCatalogDesign(design) ? "Automata Supply" : "one of one"
          }`,
          description: [
            designSubtitle(design),
            `${INKS[design.ink].name} ink`,
            `${garment.name} tee`,
            SIZES.find((s) => s.id === size)?.label,
            `${design.cells}×${design.cells} lattice`,
          ].join(" · "),
          images: [`${origin}${thumbUrl(design, garment.hex, 480)}`],
        },
      },
    });

    // Re-encode from the parsed values so metadata can never contain anything
    // the decoder did not accept.
    clean.push(
      [
        design.rule,
        design.seed,
        design.seeding === "single" ? "1" : "r",
        design.ink,
        design.cells,
        size,
        garmentId,
        qty,
      ].join("~"),
    );
  }

  try {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      success_url: `${origin}/order?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart`,
      billing_address_collection: "auto",
      shipping_address_collection: {
        allowed_countries: [...SHIPPING_COUNTRIES] as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[],
      },
      shipping_options: shippingOptions(),
      // The webhook rebuilds the print order from exactly this.
      metadata: chunkItems(clean),
      payment_intent_data: {
        description: `Automata Supply — ${clean.length} design${clean.length === 1 ? "" : "s"}`,
      },
    });

    if (!session.url) {
      return NextResponse.json({ error: "Stripe did not return a checkout URL" }, { status: 502 });
    }
    return NextResponse.json({ url: session.url, id: session.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Checkout failed";
    console.error("[checkout] failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
