import type Stripe from "stripe";
import { MAX_CART_LINES, MAX_QTY_PER_LINE, PRODUCT, SHIPPING, SHIP_COUNTRIES, SIZES, colorByKey } from "@/lib/catalog";
import { formatMomentDate, packDesign, parseDesign } from "@/lib/design";
import { siteUrl } from "@/lib/server/env";
import { signedArtUrl } from "@/lib/server/sign";
import { stripe } from "@/lib/server/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { items?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  const raw = Array.isArray(body.items) ? body.items : [];
  if (raw.length === 0) return Response.json({ error: "Your bag is empty" }, { status: 400 });
  if (raw.length > MAX_CART_LINES) return Response.json({ error: `At most ${MAX_CART_LINES} designs per order` }, { status: 400 });

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  try {
    for (const entry of raw as Record<string, unknown>[]) {
      const design = parseDesign(entry.design);
      const size = String(entry.size ?? "");
      if (!(SIZES as readonly string[]).includes(size)) throw new Error("Please choose a size");
      const qty = Math.floor(Number(entry.qty));
      if (!(qty >= 1 && qty <= MAX_QTY_PER_LINE)) throw new Error("Invalid quantity");
      const color = colorByKey(design.color);
      const title = design.title || "Untitled sky";
      lineItems.push({
        quantity: qty,
        price_data: {
          currency: PRODUCT.currency,
          unit_amount: PRODUCT.priceCents, // price is always set server-side
          product_data: {
            name: `${PRODUCT.name} — “${title}”`,
            description: `${color.label} · ${size.toUpperCase()} · ${design.place || "Custom location"} · ${formatMomentDate(design.date)}`,
            images: [signedArtUrl("mockup", design, req)],
            metadata: { design: packDesign(design), size },
          },
        },
      });
    }
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }

  const origin = siteUrl(req);
  try {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      shipping_address_collection: { allowed_countries: [...SHIP_COUNTRIES] },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            display_name: SHIPPING.label,
            fixed_amount: { amount: SHIPPING.amountCents, currency: PRODUCT.currency },
            delivery_estimate: {
              minimum: { unit: "business_day", value: SHIPPING.minDays },
              maximum: { unit: "business_day", value: SHIPPING.maxDays },
            },
          },
        },
      ],
      phone_number_collection: { enabled: true },
      billing_address_collection: "auto",
      allow_promotion_codes: true,
      success_url: `${origin}/order/{CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/bag?canceled=1`,
      payment_intent_data: { description: `${PRODUCT.name} order` },
      metadata: { store: "overhead" },
    });
    return Response.json({ url: session.url });
  } catch (e) {
    console.error("[checkout]", e);
    return Response.json({ error: "Could not start checkout. Please try again." }, { status: 502 });
  }
}
