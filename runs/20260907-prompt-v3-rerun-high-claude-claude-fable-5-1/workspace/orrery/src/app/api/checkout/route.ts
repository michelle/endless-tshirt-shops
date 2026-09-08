import { NextResponse } from "next/server";
import { stripe, ALLOWED_COUNTRIES } from "@/lib/stripe";
import { encodeDesign, sanitizeOrder, formatDate, designSummary } from "@/lib/design";
import { CURRENCY, PRICE_CENTS, teeColor } from "@/lib/catalog";
import { isPublicUrl, siteUrl } from "@/lib/site";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const order = sanitizeOrder(body);
  const enc = encodeDesign(order);
  const base = siteUrl();
  const previewUrl = `${base}/api/render?d=${enc}&w=900&bg=1`;

  try {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      line_items: [{
        quantity: order.qty,
        price_data: {
          currency: CURRENCY,
          unit_amount: PRICE_CENTS,
          product_data: {
            name: `Orrery tee — ${formatDate(order.date)}`,
            description: `"${order.caption || "(no caption)"}" · ${teeColor(order.tee).label} · size ${order.size.toUpperCase()} · ${designSummary(order)}`,
            ...(isPublicUrl(base) ? { images: [previewUrl] } : {}),
          },
        },
      }],
      shipping_address_collection: { allowed_countries: ALLOWED_COUNTRIES },
      phone_number_collection: { enabled: true },
      metadata: { design: enc, size: order.size, qty: String(order.qty), tee: order.tee, date: order.date },
      payment_intent_data: { metadata: { design: enc, size: order.size, qty: String(order.qty) }, description: `Orrery tee ${formatDate(order.date)} x${order.qty}` },
      custom_text: { shipping_address: { message: "Each shirt is printed to order from your design and shipped by our print partner. Please double-check your address." } },
      success_url: `${base}/order/{CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/?d=${enc}&size=${order.size}&qty=${order.qty}`,
    });
    return NextResponse.json({ url: session.url, id: session.id });
  } catch (e) {
    console.error("checkout error", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Checkout failed" }, { status: 500 });
  }
}
