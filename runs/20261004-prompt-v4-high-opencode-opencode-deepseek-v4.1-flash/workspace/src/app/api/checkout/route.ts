import { NextResponse } from "next/server";
import { stripe, stripeConfigured } from "@/lib/stripe";
import { siteUrl } from "@/lib/site";
import { encodeDesign, parseDesign, parseSelection } from "@/lib/schema";
import {
  COLOR_BY_ID,
  CURRENCY,
  PALETTE_BY_ID,
  SHIPPING_CENTS,
  SHIP_COUNTRIES,
  priceCents,
} from "@/lib/catalog";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Checkout is not configured yet." }, { status: 503 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  let design;
  let selection;
  try {
    design = parseDesign(body.design);
    selection = parseSelection(body);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }

  const shirt = COLOR_BY_ID.get(selection.color)!;
  const palette = PALETTE_BY_ID.get(design.palette)!;
  const base = siteUrl();
  const token = encodeDesign(design);
  const unitAmount = priceCents(selection.size);

  try {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: selection.quantity,
          price_data: {
            currency: CURRENCY,
            unit_amount: unitAmount,
            product_data: {
              name: `${design.title} — Custom Night Sky Tee`,
              description: `${palette.label} chart on a ${shirt.label.toLowerCase()} cotton tee, size ${selection.size.toUpperCase()}`,
              images: [`${base}/api/artwork?d=${token}&w=600`],
              metadata: { palette: design.palette, color: shirt.id, size: selection.size },
            },
          },
        },
      ],
      shipping_address_collection: { allowed_countries: [...SHIP_COUNTRIES] },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            display_name: "Standard shipping",
            fixed_amount: { amount: SHIPPING_CENTS, currency: CURRENCY },
            delivery_estimate: {
              minimum: { unit: "business_day", value: 5 },
              maximum: { unit: "business_day", value: 12 },
            },
          },
        },
      ],
      phone_number_collection: { enabled: true },
      metadata: {
        design: token,
        size: selection.size,
        color: selection.color,
        quantity: String(selection.quantity),
      },
      success_url: `${base}/order/{CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/?cancelled=1`,
    });
    return NextResponse.json({ url: session.url, id: session.id });
  } catch (error) {
    console.error("[checkout] failed", error);
    return NextResponse.json(
      { error: "Checkout is temporarily unavailable. Please try again." },
      { status: 502 },
    );
  }
}
