import { runtimeEnv } from "../../../lib/runtime-env";

export const runtime = "edge";

async function validSignature(raw: string, header: string, secret: string) {
  const values = header.split(",").map((part) => part.split("=", 2));
  const timestamp = values.find(([key]) => key === "t")?.[1];
  const signatures = values.filter(([key]) => key === "v1").map(([, value]) => value);
  if (!timestamp || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300 || signatures.length === 0) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${raw}`));
  const expected = Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return signatures.some((signature) => {
    if (!signature || signature.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    return diff === 0;
  });
}

function stableIdempotencyKey(value: string) {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)).then((buffer) => {
    const bytes = new Uint8Array(buffer).slice(0, 16);
    bytes[6] = (bytes[6] & 0x0f) | 0x50;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  });
}

type Session = {
  id: string; mode?: string; payment_status?: string;
  metadata?: Record<string, string>;
  customer_details?: { name?: string; email?: string; address?: { line1?: string; line2?: string; city?: string; state?: string; postal_code?: string; country?: string } };
  shipping_details?: { name?: string; address?: { line1?: string; line2?: string; city?: string; state?: string; postal_code?: string; country?: string } };
};

export async function POST(request: Request) {
  const stripeSecret = runtimeEnv.STRIPE_WEBHOOK_SECRET;
  if (!stripeSecret) return new Response("Webhook not configured", { status: 503 });
  const raw = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";
  if (!await validSignature(raw, signature, stripeSecret)) return new Response("Invalid signature", { status: 400 });
  let event: { type?: string; data?: { object?: Session } };
  try { event = JSON.parse(raw); } catch { return new Response("Invalid event", { status: 400 }); }
  if (!["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type ?? "")) return Response.json({ received: true });
  const session = event.data?.object;
  if (!session || session.mode !== "payment" || session.payment_status !== "paid") return Response.json({ received: true });
  if (!runtimeEnv.PRODIGI_API_KEY || !runtimeEnv.BUCKET) return new Response("Order fulfillment is not configured", { status: 503 });
  const metadata = session.metadata ?? {};
  const id = metadata.design_key ?? "";
  const size = metadata.size ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["xs","s","m","l","xl","2xl","3xl","4xl"].includes(size)) return new Response("Order metadata invalid", { status: 400 });
  const asset = await runtimeEnv.BUCKET.head(id);
  if (!asset) return new Response("Print asset unavailable", { status: 503 });
  const details = session.shipping_details ?? session.customer_details;
  const address = details?.address;
  if (!address?.line1 || !address.city || !address.country || !address.postal_code || !details?.name) return new Response("Shipping address unavailable", { status: 400 });
  const origin = new URL(request.url).origin;
  const order = {
    merchantReference: session.id,
    idempotencyKey: await stableIdempotencyKey(session.id),
    shippingMethod: "Budget",
    recipient: {
      name: details.name,
      email: session.customer_details?.email,
      address: { line1: address.line1, line2: address.line2 ?? null, postalOrZipCode: address.postal_code, countryCode: address.country, townOrCity: address.city, stateOrCounty: address.state ?? null },
    },
    items: [{
      merchantReference: "personal-star-map-front",
      sku: "GLOBAL-TEE-BC-3001",
      copies: 1,
      sizing: "fitPrintArea",
      attributes: { brand: "Bella + Canvas", edge: "Crew neck", color: "white", gender: "Unisex", paperType: "100% cotton", size, style: "3001" },
      assets: [{ printArea: "front", url: `${origin}/api/print/${id}` }],
    }],
    metadata: { checkoutSession: session.id, displayName: metadata.display_name ?? "", mapDate: metadata.map_date ?? "", place: metadata.place ?? "" },
  };
  const response = await fetch("https://api.sandbox.prodigi.com/v4.0/orders", {
    method: "POST",
    headers: { "X-API-Key": runtimeEnv.PRODIGI_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(order),
  });
  if (!response.ok) return new Response("Prodigi could not accept the order", { status: 502 });
  const result = await response.json() as { outcome?: string; order?: { id?: string; status?: { stage?: string; issues?: unknown[] } } };
  if (!result.order?.id || ["CreatedWithIssues", "ValidationFailed", "Failed"].includes(result.outcome ?? "")) return new Response("Prodigi returned an order issue", { status: 502 });
  return Response.json({ received: true, prodigiOrderId: result.order.id });
}
