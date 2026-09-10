import { NextResponse } from "next/server";
import { stripe, siteUrl } from "@/lib/stripe";
import { parseDesign, renderRings, DesignError, encodeDesignParam } from "@/lib/rings";
import { signDesign, putChunked } from "@/lib/token";
import { CURRENCY, MAX_QTY, PRICE_CENTS, SHIPPING_CENTS, SHIP_COUNTRIES, findColor, isSize } from "@/lib/catalog";

export const runtime = "nodejs";

/**
 * Creates a Stripe Checkout Session for one custom design. Prices are fixed server-side;
 * the design is validated and signed here so nothing downstream trusts the client.
 */
export async function POST(req: Request) {
  let body: { design?: unknown; color?: string; size?: string; quantity?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let design;
  try {
    design = parseDesign(body.design);
  } catch (e) {
    return NextResponse.json({ error: e instanceof DesignError ? e.message : "Invalid design" }, { status: 400 });
  }
  const color = findColor(String(body.color ?? ""));
  const size = String(body.size ?? "");
  const quantity = Math.round(Number(body.quantity ?? 1));
  if (!color) return NextResponse.json({ error: "Pick a shirt colour." }, { status: 400 });
  if (!isSize(size)) return NextResponse.json({ error: "Pick a size." }, { status: 400 });
  if (!Number.isFinite(quantity) || quantity < 1 || quantity > MAX_QTY)
    return NextResponse.json({ error: `Quantity must be between 1 and ${MAX_QTY}.` }, { status: 400 });

  const token = signDesign(design);
  const { rings, bornYear } = renderRings(design, { onDark: color.dark });
  const base = siteUrl();
  const previewUrl = `${base}/api/preview/${encodeURIComponent(token)}.png?c=${encodeURIComponent(color.key)}`;

  const metadata: Record<string, string> = {
    app: "heartwood",
    color: color.key,
    size,
    quantity: String(quantity),
    rings: String(rings),
    palette: design.palette,
  };
  putChunked(metadata, "d", token);

  const who = design.name ? `for ${design.name}` : "for you";
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity,
        price_data: {
          currency: CURRENCY,
          unit_amount: PRICE_CENTS,
          product_data: {
            name: `Heartwood Ring Tee · ${color.label} · ${size.toUpperCase()}`,
            description: `${rings} rings ${who}, est. ${bornYear}. Generated once, printed once.`,
            images: [previewUrl],
          },
        },
      },
    ],
    shipping_address_collection: { allowed_countries: [...SHIP_COUNTRIES] },
    shipping_options: [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          display_name: "Standard · printed to order",
          fixed_amount: { amount: SHIPPING_CENTS, currency: CURRENCY },
          delivery_estimate: {
            minimum: { unit: "business_day", value: 5 },
            maximum: { unit: "business_day", value: 12 },
          },
        },
      },
    ],
    phone_number_collection: { enabled: true },
    metadata,
    payment_intent_data: { metadata: { app: "heartwood", palette: design.palette, rings: String(rings) } },
    success_url: `${base}/order/{CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/design?d=${encodeDesignParam(design)}&c=${encodeURIComponent(color.key)}&s=${size}`,
    custom_text: {
      submit: { message: "Every shirt is generated and printed just for you, so custom orders can't be returned unless faulty." },
    },
  });

  return NextResponse.json({ url: session.url, id: session.id });
}
