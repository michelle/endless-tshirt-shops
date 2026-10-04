import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { siteOrigin } from "@/lib/origin";
import { MAX_ITEMS_PER_ORDER, PRICE_CENTS, SHIP_COUNTRIES, SHIRT_COLORS, SIZE_LABEL } from "@/lib/catalog";
import { designToParam, parseCartItem, type CartItem } from "@/lib/design";
import { itemsToMetadata } from "@/lib/orders";
import { quoteShipping } from "@/lib/prodigi";
import { shippingChargeCents } from "@/lib/pricing";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const country = String(body?.country ?? "");
  const items = (Array.isArray(body?.items) ? body.items : []).map(parseCartItem) as (CartItem | null)[];
  if (!(country in SHIP_COUNTRIES) || !items.length || items.length > MAX_ITEMS_PER_ORDER || items.some((i) => !i)) {
    return NextResponse.json({ error: "Invalid cart" }, { status: 400 });
  }
  const valid = items as CartItem[];

  let shippingCents: number;
  try {
    shippingCents = shippingChargeCents(await quoteShipping(country, valid));
  } catch {
    return NextResponse.json({ error: "We can't ship this order to that country right now." }, { status: 422 });
  }

  const origin = await siteOrigin();
  try {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      line_items: valid.map((it) => {
        const shirt = SHIRT_COLORS.find((c) => c.id === it.design.shirt)!;
        return {
          quantity: it.qty,
          price_data: {
            currency: "usd",
            unit_amount: PRICE_CENTS,
            product_data: {
              name: `Overhead Tee: ${it.design.title || "Your sky"}`,
              description: `${shirt.label}, size ${SIZE_LABEL[it.size]}. The sky over ${it.design.place.name || "your place"} on ${it.design.date}.`,
              images: [`${origin}/api/mockup?fmt=png&bg=1&w=600&d=${designToParam(it.design)}`],
            },
          },
        };
      }),
      shipping_address_collection: { allowed_countries: [country as any] },
      phone_number_collection: { enabled: true },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: shippingCents, currency: "usd" },
            display_name: `Standard shipping to ${SHIP_COUNTRIES[country]}`,
            delivery_estimate: { minimum: { unit: "business_day", value: 5 }, maximum: { unit: "business_day", value: 10 } },
          },
        },
      ],
      metadata: itemsToMetadata(valid),
      success_url: `${origin}/order/{CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error("checkout create failed", e?.message);
    return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 500 });
  }
}
