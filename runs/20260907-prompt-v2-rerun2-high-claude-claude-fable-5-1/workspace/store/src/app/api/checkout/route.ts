import { NextResponse } from "next/server";
import { CURRENCY, getColor, getProduct, getSize, PRICE_CENTS } from "@/lib/catalog";
import { encodeItems, validateItems } from "@/lib/cart-items";
import { SHIPPING, STORE_TAG } from "@/lib/fulfil";
import { siteUrl } from "@/lib/site";
import { stripe, stripeConfigured } from "@/lib/stripe";

// Countries Prodigi's Bella+Canvas 3001 ships to that we are happy to sell into.
const ALLOWED_COUNTRIES = [
  "US", "CA", "GB", "IE", "AU", "NZ", "DE", "FR", "NL", "BE", "ES", "IT", "PT", "AT", "CH", "SE", "NO", "DK", "FI", "PL", "CZ", "JP", "SG",
] as const;

export async function POST(req: Request) {
  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Payments are not configured on this deployment." }, { status: 503 });
  }
  let items;
  try {
    const body = await req.json();
    items = validateItems(body?.items);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Invalid cart" }, { status: 400 });
  }

  const base = siteUrl();
  const origin = req.headers.get("origin") || base;

  try {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      line_items: items.map((i) => {
        const p = getProduct(i.slug)!;
        const c = getColor(i.color)!;
        const s = getSize(i.size)!;
        return {
          quantity: i.qty,
          price_data: {
            currency: CURRENCY,
            unit_amount: PRICE_CENTS,
            product_data: {
              name: `${p.bureau} Tee`,
              description: `${c.label} / ${s.label} · Bella+Canvas 3001, 100% cotton`,
              images: [`${base}/designs/${p.slug}-${c.ink}-preview.png`],
            },
          },
        };
      }),
      shipping_address_collection: { allowed_countries: [...ALLOWED_COUNTRIES] },
      phone_number_collection: { enabled: true },
      shipping_options: Object.entries(SHIPPING).map(([key, s]) => ({
        shipping_rate_data: {
          type: "fixed_amount",
          display_name: s.label,
          fixed_amount: { amount: s.amount, currency: CURRENCY },
          metadata: { prodigi: s.prodigi, key },
        },
      })),
      metadata: { items: encodeItems(items), store: STORE_TAG },
      success_url: `${origin}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart?cancelled=1`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("checkout error", e);
    return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 500 });
  }
}
