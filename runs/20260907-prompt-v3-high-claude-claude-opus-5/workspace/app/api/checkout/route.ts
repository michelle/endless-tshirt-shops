import { NextRequest, NextResponse } from "next/server";
import { stripe, siteUrl } from "@/lib/stripe";
import { normalizeSpec } from "@/lib/spec";
import { normalizeGarment, colorById, CURRENCY, SHIPPING_COUNTRIES } from "@/lib/catalog";
import { buildDraft, previewUrl } from "@/lib/order";
import type Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const body = (payload ?? {}) as Record<string, unknown>;
  const spec = normalizeSpec((body.spec ?? {}) as never);
  const garment = normalizeGarment((body.garment ?? {}) as never);
  const draft = buildDraft(spec, garment);
  const color = colorById(garment.color)!;
  const origin = siteUrl();

  // Stripe only fetches product images over public https.
  const images = origin.startsWith("https://")
    ? [previewUrl(origin, draft.ink, draft.token, 640, color.hex)]
    : undefined;

  const metadata: Stripe.MetadataParam = {
    design_token: draft.token,
    ink: draft.ink,
    garment_color: garment.color,
    garment_size: garment.size,
    common_name: draft.commonName,
    binomial: draft.binomial,
    keeper: spec.keeper,
  };

  try {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: CURRENCY,
            unit_amount: draft.amountCents,
            product_data: {
              name: `${draft.commonName} — one-of-one field guide tee`,
              description: `${draft.binomial} · ${draft.colorLabel} · ${draft.sizeLabel} · Bella+Canvas 3001, DTG printed`,
              ...(images ? { images } : {}),
            },
          },
        },
      ],
      // Shipping is priced into the garment, so no separate shipping line.
      shipping_address_collection: {
        allowed_countries: SHIPPING_COUNTRIES as unknown as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[],
      },
      phone_number_collection: { enabled: true },
      billing_address_collection: "auto",
      metadata,
      payment_intent_data: { metadata },
      success_url: `${origin}/order/{CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?canceled=1#summon`,
    });

    if (!session.url) {
      throw new Error("Stripe did not return a Checkout URL");
    }
    return NextResponse.json({ url: session.url, id: session.id });
  } catch (err) {
    console.error("[checkout] failed", err);
    const message = err instanceof Error ? err.message : "Checkout could not be started";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
