import { bindings, PRICE_CENTS, reply, SITE_URL } from "../../../lib/store";
export const runtime = "edge";
type StripeSession = { id: string; client_reference_id?: string; payment_status?: string; amount_total?: number; currency?: string; shipping_details?: { name?: string; address?: Address }; collected_information?: { shipping_details?: { name?: string; address?: Address } } };
type Address = { line1?: string; line2?: string; city?: string; state?: string; postal_code?: string; country?: string };
async function signatureValid(payload: string, header: string, secret: string) {
  const parts = Object.fromEntries(header.split(",").map(p => p.trim().split("=", 2)));
  const timestamp = Number(parts.t);
  if (!timestamp || Math.abs(Date.now() / 1000 - timestamp) > 300 || !parts.v1) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${parts.t}.${payload}`)));
  const actual = Array.from(mac, x => x.toString(16).padStart(2, "0")).join("");
  const expected = parts.v1;
  if (actual.length !== expected.length) return false;
  let diff = 0; for (let i = 0; i < actual.length; i++) diff |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
export async function POST(request: Request) {
  const env = bindings();
  if (!env.STRIPE_WEBHOOK_SECRET || !env.STRIPE_SECRET_KEY || !env.PRODIGI_API_KEY || !env.DB) return reply({ error: "Store configuration incomplete" }, 503);
  const payload = await request.text();
  if (!(await signatureValid(payload, request.headers.get("stripe-signature") || "", env.STRIPE_WEBHOOK_SECRET))) return reply({ error: "Invalid signature" }, 400);
  const event = JSON.parse(payload) as { type?: string; data?: { object?: { id?: string } } };
  if (event.type !== "checkout.session.completed") return reply({ received: true });
  const sessionId = event.data?.object?.id;
  if (!sessionId?.startsWith("cs_")) return reply({ error: "Invalid session" }, 400);
  const stripe = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, { headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } });
  if (!stripe.ok) return reply({ error: "Cannot verify payment" }, 502);
  const session = await stripe.json() as StripeSession;
  if (session.payment_status !== "paid" || session.amount_total !== PRICE_CENTS || session.currency !== "usd") return reply({ received: true });
  const id = session.client_reference_id;
  if (!id) return reply({ error: "Missing order reference" }, 400);
  const order = await env.DB.prepare("SELECT id, size, status, stripe_session_id FROM orders WHERE id=?").bind(id).first<{ id: string; size: string; status: string; stripe_session_id: string }>();
  if (!order || order.stripe_session_id !== sessionId) return reply({ error: "Order mismatch" }, 400);
  if (order.status !== "pending") return reply({ received: true });
  const shipping = session.shipping_details || session.collected_information?.shipping_details;
  const address = shipping?.address;
  if (!shipping?.name || !address?.line1 || !address.city || !address.postal_code || address.country !== "US") {
    await env.DB.prepare("UPDATE orders SET status='needs_review', error='Missing shipping address' WHERE id=?").bind(id).run();
    return reply({ received: true });
  }
  const claimed = await env.DB.prepare("UPDATE orders SET status='processing' WHERE id=? AND status='pending'").bind(id).run();
  if (!claimed.meta.changes) return reply({ received: true });
  const body = {
    merchantReference: id, shippingMethod: "Standard",
    recipient: { name: shipping.name, address: { line1: address.line1, line2: address.line2 || null, postalOrZipCode: address.postal_code, countryCode: "US", townOrCity: address.city, stateOrCounty: address.state || null } },
    items: [{ merchantReference: id, sku: "GLOBAL-TEE-GIL-64000", copies: 1, sizing: "fillPrintArea", attributes: { color: "navy blue", size: order.size.toLowerCase() }, assets: [{ printArea: "front", url: `${SITE_URL}/api/art/${id}` }] }], metadata: { stripeSessionId: sessionId },
  };
  try {
    const prodigi = await fetch(`${env.PRODIGI_API_BASE || "https://api.sandbox.prodigi.com"}/v4.0/Orders`, { method: "POST", headers: { "X-API-Key": env.PRODIGI_API_KEY, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await prodigi.json() as { order?: { id?: string }; outcome?: string; failures?: unknown };
    if (!prodigi.ok || !result.order?.id) {
      console.error("Prodigi order rejected", result);
      await env.DB.prepare("UPDATE orders SET status='needs_review', error=? WHERE id=?").bind(JSON.stringify(result).slice(0, 1000), id).run();
      return reply({ received: true });
    }
    await env.DB.prepare("UPDATE orders SET status='submitted', prodigi_order_id=? WHERE id=?").bind(result.order.id, id).run();
    return reply({ received: true });
  } catch (error) {
    console.error("Prodigi order submission uncertain", error);
    await env.DB.prepare("UPDATE orders SET status='needs_review', error='Prodigi submission uncertain' WHERE id=?").bind(id).run();
    return reply({ received: true });
  }
}
