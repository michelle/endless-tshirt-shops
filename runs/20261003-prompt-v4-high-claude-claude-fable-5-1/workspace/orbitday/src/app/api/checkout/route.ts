import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { stripe, siteUrl } from "@/lib/stripe";
import { designSchema, designSummary, encodeDesign, formatDateLong, PRODUCT, SHIRT_COLORS } from "@/lib/design";

export const runtime = "nodejs";

const bodySchema = z.object({
  design: designSchema,
  quantity: z.number().int().min(1).max(10).default(1),
});

/** Countries Prodigi ships this SKU to that Stripe also accepts for shipping collection. */
const SHIP_TO = [
  "US", "CA", "GB", "IE", "AU", "NZ", "DE", "FR", "ES", "IT", "NL", "BE", "AT", "CH", "SE", "NO", "DK", "FI",
  "PT", "PL", "CZ", "HU", "RO", "GR", "SK", "SI", "HR", "BG", "EE", "LV", "LT", "LU", "MT", "CY", "IS", "JP",
  "KR", "SG", "HK", "TW", "MY", "TH", "PH", "ID", "IN", "AE", "SA", "QA", "IL", "TR", "ZA", "MX", "BR", "AR",
  "CL", "CO", "PE",
] as const;

export async function POST(req: NextRequest) {
  let parsed;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "Invalid design", detail: String(e) }, { status: 400 });
  }
  const { design, quantity } = parsed;
  const token = encodeDesign(design);
  const base = siteUrl(req);
  const summary = designSummary(design);
  const shirt = SHIRT_COLORS[design.shirt];

  try {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity,
          price_data: {
            currency: PRODUCT.currency,
            unit_amount: PRODUCT.priceCents,
            product_data: {
              name: `${PRODUCT.name} — ${design.name || formatDateLong(design.date)}`,
              description: `${summary} · ${shirt.label} · Size ${design.size.toUpperCase()} · ${PRODUCT.garment}`,
              images: base.startsWith("https://") ? [`${base}/api/art/${token}.png?w=800&bg=1`] : [],
              metadata: { design: token },
            },
          },
        },
      ],
      shipping_address_collection: { allowed_countries: [...SHIP_TO] },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: PRODUCT.shippingCents, currency: PRODUCT.currency },
            display_name: "Standard shipping",
            delivery_estimate: {
              minimum: { unit: "business_day", value: 5 },
              maximum: { unit: "business_day", value: 12 },
            },
          },
        },
      ],
      phone_number_collection: { enabled: true },
      billing_address_collection: "auto",
      allow_promotion_codes: true,
      metadata: {
        design: token,
        quantity: String(quantity),
        summary: summary.slice(0, 450),
        sku: PRODUCT.sku,
        color: design.shirt,
        size: design.size,
      },
      payment_intent_data: {
        description: `Orbitday Tee · ${summary}`.slice(0, 900),
        metadata: { design: token, summary: summary.slice(0, 450) },
      },
      success_url: `${base}/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/design?d=${token}`,
    });
    return NextResponse.json({ url: session.url, id: session.id });
  } catch (e) {
    console.error("checkout session error", e);
    return NextResponse.json({ error: "Could not start checkout" }, { status: 500 });
  }
}
