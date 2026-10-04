import { bindings, PRICE_CENTS, reply, SITE_URL } from "../../../lib/store";
export const runtime = "edge";
export async function POST(request: Request) {
  const env = bindings();
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET || !env.PRODIGI_API_KEY) return reply({ error: "Secure checkout is being connected. Please check back shortly." }, 503);
  if (!env.DB || !env.BUCKET) return reply({ error: "The store is temporarily unavailable." }, 503);
  try {
    const form = await request.formData();
    const place = String(form.get("place") || "").trim(), date = String(form.get("date") || ""), note = String(form.get("note") || "").trim(), size = String(form.get("size") || "");
    const art = form.get("art");
    if (!place || place.length > 28 || !note || note.length > 40 || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !["S", "M", "L", "XL", "2XL"].includes(size) || !(art instanceof File)) return reply({ error: "Please check your customization and try again." }, 400);
    if (art.size < 5000 || art.size > 12000000 || art.type !== "image/png") return reply({ error: "The print file could not be prepared. Please try again." }, 400);
    const bytes = await art.arrayBuffer(), header = new DataView(bytes);
    if (header.getUint32(0) !== 0x89504e47 || header.getUint32(16) !== 3600 || header.getUint32(20) !== 4400) return reply({ error: "The print file has the wrong format." }, 400);
    const id = crypto.randomUUID();
    await env.BUCKET.put(`orders/${id}.png`, bytes, { httpMetadata: { contentType: "image/png" } });
    await env.DB.prepare("INSERT INTO orders (id, place, date, note, size, status, created_at) VALUES (?, ?, ?, ?, ?, 'pending', ?)").bind(id, place, date, note, size, new Date().toISOString()).run();
    const params = new URLSearchParams();
    params.set("mode", "payment"); params.set("payment_method_types[0]", "card"); params.set("client_reference_id", id); params.set("metadata[order_id]", id);
    params.set("line_items[0][price_data][currency]", "usd"); params.set("line_items[0][price_data][unit_amount]", String(PRICE_CENTS));
    params.set("line_items[0][price_data][product_data][name]", "Elsewhere, Always — personalized shirt");
    params.set("line_items[0][price_data][product_data][description]", `${place} · ${size} · navy`); params.set("line_items[0][quantity]", "1");
    params.set("shipping_address_collection[allowed_countries][0]", "US");
    params.set("success_url", `${SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`); params.set("cancel_url", `${SITE_URL}/#studio`);
    const stripe = await fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded", "Idempotency-Key": id }, body: params });
    const session = await stripe.json() as { id?: string; url?: string; error?: { message?: string } };
    if (!stripe.ok || !session.id || !session.url) { await env.DB.prepare("UPDATE orders SET status='checkout_error', error=? WHERE id=?").bind(session.error?.message || "Stripe checkout failed", id).run(); return reply({ error: "Secure checkout is unavailable right now. Please try again later." }, 502); }
    await env.DB.prepare("UPDATE orders SET stripe_session_id=? WHERE id=?").bind(session.id, id).run();
    return reply({ url: session.url });
  } catch (error) { console.error("checkout failed", error); return reply({ error: "Checkout could not start. Please try again." }, 500); }
}
