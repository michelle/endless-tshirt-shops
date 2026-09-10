import { NextResponse } from "next/server";
import Stripe from "stripe";
import crypto from "node:crypto";
import { sanitizeText } from "@/lib/constellation";
import {
  PRODIGI_SKU,
  SHIRT_COLORS,
  SIZES,
  PHRASE_MAX_LEN,
  SUBTITLE_MAX_LEN,
  MAX_QTY_PER_ITEM,
  MAX_ITEMS_PER_ORDER,
  ALLOWED_SHIP_COUNTRIES,
  SHIPPING_FLAT_CENTS,
  priceForSize,
} from "@/lib/products";
import { savePendingOrder } from "@/lib/store";

export const runtime = "nodejs";

let _stripe;
function getStripe() {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return _stripe;
}

function isTrustedImageUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

export async function POST(req) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Payments are not configured yet." }, { status: 500 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rawItems = Array.isArray(body?.items) ? body.items : [];
  if (rawItems.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }
  if (rawItems.length > MAX_ITEMS_PER_ORDER) {
    return NextResponse.json({ error: "Too many items in one order" }, { status: 400 });
  }

  // Re-validate & re-price every item server-side. Nothing from the client
  // (price, sku, attributes) is trusted.
  const orderItems = [];
  const lineItems = [];

  for (const raw of rawItems) {
    const color = SHIRT_COLORS.find((c) => c.key === raw.colorKey);
    const size = SIZES.find((s) => s.key === raw.sizeKey);
    const qty = Number.isInteger(raw.qty) ? raw.qty : parseInt(raw.qty, 10);

    if (!color || !size) {
      return NextResponse.json({ error: "Invalid color or size" }, { status: 400 });
    }
    if (!qty || qty < 1 || qty > MAX_QTY_PER_ITEM) {
      return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
    }
    if (!isTrustedImageUrl(raw.imageUrl)) {
      return NextResponse.json({ error: "Invalid artwork reference" }, { status: 400 });
    }

    const phrase = sanitizeText(raw.phrase, PHRASE_MAX_LEN) || "Your Name";
    const subtitle = sanitizeText(raw.subtitle, SUBTITLE_MAX_LEN);
    const unitAmount = priceForSize(size.key);

    orderItems.push({
      sku: PRODIGI_SKU,
      copies: qty,
      sizing: "fitPrintArea",
      attributes: { color: color.prodigi, size: size.key },
      assets: [{ printArea: "front", url: raw.imageUrl }],
      phrase,
      subtitle,
    });

    lineItems.push({
      quantity: qty,
      price_data: {
        currency: "usd",
        unit_amount: unitAmount,
        product_data: {
          name: `Constella Tee — "${phrase}"${subtitle ? " — " + subtitle : ""} (${color.name}, ${size.label.toUpperCase()})`,
          images: [raw.imageUrl],
          metadata: { sku: PRODIGI_SKU, color: color.key, size: size.key },
        },
      },
    });
  }

  const orderId = crypto.randomUUID();
  const orderRecordUrl = await savePendingOrder(orderId, {
    orderId,
    items: orderItems,
    createdAt: new Date().toISOString(),
  });

  const origin = req.headers.get("origin") || `https://${req.headers.get("host")}`;

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      shipping_address_collection: { allowed_countries: ALLOWED_SHIP_COUNTRIES },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: SHIPPING_FLAT_CENTS, currency: "usd" },
            display_name: "Standard Shipping (5–9 business days)",
          },
        },
      ],
      phone_number_collection: { enabled: true },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart`,
      metadata: { orderId, orderRecordUrl },
      payment_intent_data: { metadata: { orderId } },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe session creation failed", err);
    return NextResponse.json({ error: "Could not start checkout" }, { status: 500 });
  }
}
