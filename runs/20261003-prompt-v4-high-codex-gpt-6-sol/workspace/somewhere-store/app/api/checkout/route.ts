import { env } from "cloudflare:workers";
import { bindings, shippingPrice, shirtPrice, totalPrice } from "@/lib/store";

export const runtime = "edge";

export async function POST(request: Request) {
  if (!env.STRIPE_SECRET_KEY) return Response.json({ error: "Checkout is being connected. Please come back soon." }, { status: 503 });
  try {
    const data = await request.formData();
    const place = String(data.get("place") || "").trim();
    const momentDate = String(data.get("momentDate") || "");
    const dedication = String(data.get("dedication") || "").trim();
    const color = String(data.get("color") || "");
    const size = String(data.get("size") || "");
    const art = data.get("art");
    if (!place || place.length > 32 || !/^\d{4}-\d{2}-\d{2}$/.test(momentDate) ||
        !dedication || dedication.length > 38 || !["black", "navy"].includes(color) ||
        !["s", "m", "l", "xl", "2xl"].includes(size) || !(art instanceof File)) {
      return Response.json({ error: "Please check your design details." }, { status: 400 });
    }
    if (art.size < 1000 || art.size > 16000000 || art.type !== "image/png") {
      return Response.json({ error: "The print image could not be uploaded." }, { status: 400 });
    }
    const image = new Uint8Array(await art.arrayBuffer());
    const view = new DataView(image.buffer);
    if (view.getUint32(0) !== 0x89504e47 || view.getUint32(16) !== 4677 || view.getUint32(20) !== 5787) {
      return Response.json({ error: "The print image has the wrong size." }, { status: 400 });
    }
    const { db, bucket } = bindings();
    const id = crypto.randomUUID();
    await bucket.put(`art/${id}.png`, image, { httpMetadata: { contentType: "image/png" } });
    await db.prepare(`INSERT INTO orders
      (id, created_at, status, place, moment_date, dedication, color, size)
      VALUES (?, ?, 'draft', ?, ?, ?, ?, ?)`).bind(id, Date.now(), place, momentDate, dedication, color, size).run();

    const origin = new URL(request.url).origin;
    const params = new URLSearchParams({
      mode: "payment",
      success_url: `${origin}/?order=${id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?cancelled=1`,
      "metadata[order_id]": id,
      "shipping_address_collection[allowed_countries][0]": "US",
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][unit_amount]": String(shirtPrice),
      "line_items[0][price_data][product_data][name]": "Somewhere, Always — custom t-shirt",
      "line_items[0][price_data][product_data][description]": `${place} · ${momentDate} · ${color} · ${size.toUpperCase()}`,
      "line_items[0][quantity]": "1",
      "shipping_options[0][shipping_rate_data][type]": "fixed_amount",
      "shipping_options[0][shipping_rate_data][fixed_amount][amount]": String(shippingPrice),
      "shipping_options[0][shipping_rate_data][fixed_amount][currency]": "usd",
      "shipping_options[0][shipping_rate_data][display_name]": "Standard shipping",
    });
    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
    const session = await response.json() as Record<string, any>;
    if (!response.ok || !session.id || !session.url) {
      console.error("Stripe checkout error", session.error?.message || response.status);
      return Response.json({ error: "Checkout could not start. Please try again." }, { status: 502 });
    }
    await db.prepare("UPDATE orders SET stripe_session = ?, status = 'awaiting_payment' WHERE id = ?")
      .bind(session.id, id).run();
    return Response.json({ url: session.url, orderId: id, total: totalPrice });
  } catch (error) {
    console.error("Checkout error", error);
    return Response.json({ error: "Checkout is temporarily unavailable." }, { status: 500 });
  }
}
