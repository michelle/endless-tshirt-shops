import { NextRequest, NextResponse } from "next/server";
import { stripe, PaymentsNotConfiguredError } from "@/lib/stripe";
import { parseDesign, encodeDesign } from "@/lib/design";
import { previewImageUrl } from "@/lib/fulfillment";
import { siteUrl } from "@/lib/site";
import { CURRENCY, MAX_QUANTITY, PRODUCT_NAME, SHIP_COUNTRIES, UNIT_PRICE_CENTS, garmentByKey, isSize } from "@/lib/catalog";
import { makeLabel } from "@/lib/botanical/generator";
import { toPlantInput } from "@/lib/design";
import { CLIMATES } from "@/lib/botanical/palette";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { design?: unknown; size?: string; quantity?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseDesign(body.design);
  if (!parsed.design) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const design = parsed.design;

  const size = String(body.size ?? "");
  if (!isSize(size)) return NextResponse.json({ error: "Please choose a size" }, { status: 400 });
  const quantity = Number(body.quantity ?? 1);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
    return NextResponse.json({ error: `Quantity must be between 1 and ${MAX_QUANTITY}` }, { status: 400 });
  }
  const garment = garmentByKey(design.garment)!;
  const label = makeLabel(toPlantInput(design));

  try {
    const s = stripe();
    const base = siteUrl(req.nextUrl.origin);
    const session = await s.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity,
          price_data: {
            currency: CURRENCY,
            unit_amount: UNIT_PRICE_CENTS,
            product_data: {
              name: PRODUCT_NAME,
              description: `${label.genus} ${label.species} · ${CLIMATES[design.climate].label} · ${garment.label} · size ${size.toUpperCase()}`,
              images: [previewImageUrl(design)],
            },
          },
        },
      ],
      shipping_address_collection: { allowed_countries: [...SHIP_COUNTRIES] },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            display_name: "Standard shipping (included)",
            fixed_amount: { amount: 0, currency: CURRENCY },
            delivery_estimate: {
              minimum: { unit: "business_day", value: 5 },
              maximum: { unit: "business_day", value: 12 },
            },
          },
        },
      ],
      phone_number_collection: { enabled: true },
      metadata: { design: encodeDesign(design), size, quantity: String(quantity) },
      payment_intent_data: {
        description: `Bloomprint tee: ${label.genus} ${label.species} (No. ${label.specimenNo})`,
        metadata: { design: encodeDesign(design), size, quantity: String(quantity) },
      },
      success_url: `${base}/order/{CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/design?d=${encodeDesign(design)}&size=${size}`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    if (err instanceof PaymentsNotConfiguredError) {
      return NextResponse.json({ error: "Payments are not configured on this deployment yet (missing STRIPE_SECRET_KEY)." }, { status: 503 });
    }
    console.error("checkout error", err);
    return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 500 });
  }
}
