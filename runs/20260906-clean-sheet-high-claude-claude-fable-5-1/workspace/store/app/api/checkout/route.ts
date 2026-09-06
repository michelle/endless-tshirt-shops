import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { siteUrl } from "@/lib/site";
import {
  COLOR_BY_ID, CURRENCY, DESIGN_STYLES, SHIPPING_CENTS, SHIP_COUNTRIES,
  findCode, isDesignStyle, isSize, mockupFileName, priceCents,
} from "@/lib/catalog";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const status = findCode(String(body.code ?? ""));
  const color = COLOR_BY_ID.get(String(body.color ?? ""));
  const style = body.style;
  const size = body.size;
  const quantity = Math.min(10, Math.max(1, Math.floor(Number(body.quantity ?? 1)) || 1));
  if (!status || !color || !isDesignStyle(style) || !isSize(size)) {
    return NextResponse.json({ error: "invalid tee spec" }, { status: 400 });
  }
  const styleLabel = DESIGN_STYLES.find((d) => d.id === style)!.label;
  const base = siteUrl();

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity,
        price_data: {
          currency: CURRENCY,
          unit_amount: priceCents(size),
          product_data: {
            name: `${status.code} ${status.phrase} tee`,
            description: `${styleLabel} print on a ${color.label.toLowerCase()} Gildan Softstyle tee, size ${size.toUpperCase()}`,
            images: [`${base}/mockup/${mockupFileName(status.code, style, color.id)}`],
            metadata: { code: String(status.code), style, color: color.id, size },
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
    metadata: { code: String(status.code), style, color: color.id, size, quantity: String(quantity) },
    success_url: `${base}/order/{CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/tee/${status.code}?style=${style}&color=${encodeURIComponent(color.id)}&size=${size}`,
  });

  return NextResponse.json({ url: session.url, id: session.id });
}
