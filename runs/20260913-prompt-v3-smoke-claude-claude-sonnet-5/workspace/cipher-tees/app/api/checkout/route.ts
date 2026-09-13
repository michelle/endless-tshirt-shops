import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { getSiteUrl } from "@/lib/site";
import { encodeItemsToMetadata, artUrlForItem } from "@/lib/orderMeta";
import {
  MAX_ITEMS_PER_ORDER,
  MAX_QTY_PER_ITEM,
  PALETTES,
  SHIRT_COLORS,
  isPaletteId,
  isShirtColorId,
  isSizeId,
  priceForSize,
  sanitizePhrase,
  type CartItem,
} from "@/lib/types";

export const runtime = "nodejs";

// Broad but deliberately curated list matching countries Prodigi's
// GLOBAL-TEE-GIL-64000 fulfillment network ships to, so we don't collect
// payment for an address Prodigi can't actually deliver to.
const ALLOWED_COUNTRIES: Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[] =
  [
    "US", "CA", "GB", "AU", "NZ", "IE",
    "DE", "FR", "ES", "IT", "NL", "BE", "AT", "CH",
    "SE", "NO", "DK", "FI", "PT", "PL", "CZ",
    "JP", "KR", "SG", "HK",
    "MX", "BR", "ZA",
  ];

export async function POST(req: NextRequest) {
  let body: { items?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const rawItems = Array.isArray(body.items) ? body.items : [];
  if (rawItems.length === 0) {
    return NextResponse.json({ error: "Your cart is empty" }, { status: 400 });
  }
  if (rawItems.length > MAX_ITEMS_PER_ORDER) {
    return NextResponse.json({ error: "Too many items in one order" }, { status: 400 });
  }

  const items: CartItem[] = [];
  for (const raw of rawItems) {
    if (!raw || typeof raw !== "object") {
      return NextResponse.json({ error: "Invalid item in cart" }, { status: 400 });
    }
    const r = raw as Record<string, any>;
    const phrase = sanitizePhrase(String(r.spec?.phrase ?? ""));
    const paletteId = isPaletteId(r.spec?.paletteId) ? r.spec.paletteId : null;
    const shirtColorId = isShirtColorId(r.spec?.shirtColorId) ? r.spec.shirtColorId : null;
    const size = isSizeId(r.size) ? r.size : null;
    const qty = Math.min(MAX_QTY_PER_ITEM, Math.max(1, parseInt(String(r.qty), 10) || 1));

    if (!phrase || !paletteId || !shirtColorId || !size) {
      return NextResponse.json({ error: "Invalid item in cart" }, { status: 400 });
    }
    items.push({
      id: String(r.id ?? crypto.randomUUID()),
      spec: { phrase, paletteId, shirtColorId },
      size,
      qty,
    });
  }

  const siteUrl = getSiteUrl();
  const metadata = encodeItemsToMetadata(items);

  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => {
    const artUrl = artUrlForItem(siteUrl, {
      phrase: item.spec.phrase,
      palette: item.spec.paletteId,
      shirt: item.spec.shirtColorId,
      size: item.size,
      qty: item.qty,
    });
    return {
      quantity: item.qty,
      price_data: {
        currency: "usd",
        unit_amount: priceForSize(item.size),
        product_data: {
          name: `Cipher Tee — "${item.spec.phrase}"`,
          description: `${SHIRT_COLORS[item.spec.shirtColorId].name} · Size ${item.size.toUpperCase()} · ${PALETTES[item.spec.paletteId].name} palette`,
          images: [artUrl],
        },
      },
    };
  });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      metadata,
      payment_intent_data: { metadata },
      shipping_address_collection: { allowed_countries: ALLOWED_COUNTRIES },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: 695, currency: "usd" },
            display_name: "Standard shipping",
            delivery_estimate: {
              minimum: { unit: "business_day", value: 5 },
              maximum: { unit: "business_day", value: 12 },
            },
          },
        },
      ],
      success_url: `${siteUrl}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/cart`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("checkout session creation failed", err);
    return NextResponse.json({ error: "Could not start checkout" }, { status: 500 });
  }
}
