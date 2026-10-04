import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { describeDesign, encodeDesign, sanitizeDesign } from "@/lib/design";
import { SHIP_COUNTRIES, SHIPPING_OPTIONS, SHIRT_PRICE_CENTS, shirtById, sizeById } from "@/lib/catalog";
import { artUrl, siteUrl } from "@/lib/sign";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { design?: unknown; size?: string; qty?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const design = sanitizeDesign(body.design);
  const size = sizeById(String(body.size ?? "l"));
  const qty = Math.min(5, Math.max(1, Math.round(Number(body.qty ?? 1)) || 1));
  const shirt = shirtById(design.shirt);
  const encoded = encodeDesign(design);
  const base = siteUrl(req);

  try {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: qty,
          price_data: {
            currency: "usd",
            unit_amount: SHIRT_PRICE_CENTS,
            product_data: {
              name: `Orbital tee · ${shirt.label} · ${size.label}`,
              description: describeDesign(design),
              images: [artUrl(base, encoded, "preview")],
            },
          },
        },
      ],
      shipping_address_collection: { allowed_countries: [...SHIP_COUNTRIES] },
      phone_number_collection: { enabled: true },
      shipping_options: SHIPPING_OPTIONS.map((o) => ({
        shipping_rate_data: {
          type: "fixed_amount",
          display_name: o.label,
          fixed_amount: { amount: o.cents, currency: "usd" },
          delivery_estimate: {
            minimum: { unit: "business_day", value: o.minDays },
            maximum: { unit: "business_day", value: o.maxDays },
          },
          metadata: { option: o.id, prodigi: o.prodigiMethod },
        },
      })),
      metadata: { design: encoded, size: size.id, shirt: shirt.id, qty: String(qty) },
      success_url: `${base}/order/{CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/?d=${encoded}&cancelled=1`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("checkout error", e);
    return NextResponse.json({ error: "could not start checkout" }, { status: 500 });
  }
}
