import { NextResponse } from "next/server";
import { SHIRTS, SIZES, encodeDesign, formatWhen, parseDesign, type Size } from "@/lib/design";
import { CURRENCY, MAX_QTY, PRICE_CENTS, SHIPPING, SHIP_COUNTRIES } from "@/lib/catalog";
import { previewUrl } from "@/lib/sign";
import { chunkMetadata, stripe } from "@/lib/stripe";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { design?: unknown; size?: string; quantity?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  let design;
  try {
    design = parseDesign(body.design);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  const size = String(body.size) as Size;
  if (!SIZES.includes(size)) return NextResponse.json({ error: "Please choose a size." }, { status: 400 });
  const quantity = Math.min(MAX_QTY, Math.max(1, Math.floor(Number(body.quantity) || 1)));

  const origin = env.siteUrl();
  try {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity,
          adjustable_quantity: { enabled: true, minimum: 1, maximum: MAX_QTY },
          price_data: {
            currency: CURRENCY,
            unit_amount: PRICE_CENTS,
            product_data: {
              name: `Overhead Tee — “${design.title}”`,
              description: `${SHIRTS[design.shirt].label} · Size ${size.toUpperCase()} · The sky over ${design.place || "your place"}, ${formatWhen(design.when)}`,
              images: [previewUrl(design)],
            },
          },
        },
      ],
      shipping_address_collection: { allowed_countries: [...SHIP_COUNTRIES] },
      shipping_options: Object.entries(SHIPPING).map(([method, s]) => ({
        shipping_rate_data: {
          type: "fixed_amount" as const,
          display_name: s.label,
          fixed_amount: { amount: s.cents, currency: CURRENCY },
          delivery_estimate: {
            minimum: { unit: "business_day" as const, value: s.min },
            maximum: { unit: "business_day" as const, value: s.max },
          },
          metadata: { prodigi_method: method },
        },
      })),
      phone_number_collection: { enabled: true },
      metadata: { size, shirt: design.shirt, ...chunkMetadata("design", encodeDesign(design)) },
      success_url: `${origin}/order/{CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/design?d=${encodeDesign(design)}&size=${size}`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("checkout error", e);
    return NextResponse.json({ error: "We couldn't start checkout. Please try again." }, { status: 502 });
  }
}
