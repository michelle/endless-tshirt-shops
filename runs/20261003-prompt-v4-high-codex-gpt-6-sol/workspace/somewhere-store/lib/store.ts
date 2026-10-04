import { env } from "cloudflare:workers";

export const shirtPrice = 3900;
export const shippingPrice = 600;
export const totalPrice = shirtPrice + shippingPrice;
export const sku = "A-MT-GD64000";

export type Order = {
  id: string;
  status: string;
  place: string;
  moment_date: string;
  dedication: string;
  color: string;
  size: string;
  stripe_session: string | null;
  processing_at: number | null;
  prodigi_id: string | null;
};

export function bindings() {
  if (!env.DB || !env.BUCKET) throw new Error("Store storage is not configured");
  return { db: env.DB, bucket: env.BUCKET };
}

export async function getOrder(id: string): Promise<Order | null> {
  const { db } = bindings();
  return (await db.prepare("SELECT * FROM orders WHERE id = ?").bind(id).first<Order>()) ?? null;
}

export async function stripeSession(id: string) {
  if (!env.STRIPE_SECRET_KEY) throw new Error("Stripe is not configured");
  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
  });
  if (!response.ok) throw new Error(`Stripe session lookup failed: ${response.status}`);
  return response.json() as Promise<Record<string, any>>;
}

export async function fulfillPaidOrder(id: string, origin: string) {
  const { db } = bindings();
  const order = await getOrder(id);
  if (!order?.stripe_session) return { status: "not_found" };
  if (order.status === "submitted") return { status: "submitted" };

  // The payment decision always comes from Stripe's authenticated API.
  const session = await stripeSession(order.stripe_session);
  if (session.metadata?.order_id !== id || session.payment_status !== "paid" ||
      session.amount_total !== totalPrice || session.currency?.toLowerCase() !== "usd") {
    return { status: "awaiting_payment" };
  }

  const shipping = session.collected_information?.shipping_details ?? session.shipping_details;
  const address = shipping?.address;
  if (!address?.line1 || !address?.city || !address?.postal_code || address?.country !== "US") {
    await db.prepare("UPDATE orders SET status = 'needs_attention', failure = ? WHERE id = ?")
      .bind("Stripe shipping address missing or outside US", id).run();
    return { status: "needs_attention" };
  }
  if (!env.PRODIGI_API_KEY) {
    await db.prepare("UPDATE orders SET status = 'needs_attention', failure = ? WHERE id = ?")
      .bind("Prodigi is not configured", id).run();
    return { status: "needs_attention" };
  }

  const now = Date.now();
  const claimed = await db.prepare(`UPDATE orders SET status = 'processing', processing_at = ?
    WHERE id = ? AND (status IN ('awaiting_payment', 'fulfillment_failed', 'needs_attention')
      OR (status = 'processing' AND processing_at < ?))`)
    .bind(now, id, now - 120000).run();
  if (!claimed.meta.changes) return { status: "processing" };

  const body = {
    merchantReference: id,
    idempotencyKey: id,
    shippingMethod: "Standard",
    recipient: {
      name: shipping.name || session.customer_details?.name || "Customer",
      email: session.customer_details?.email || undefined,
      address: {
        line1: address.line1,
        line2: address.line2 || undefined,
        townOrCity: address.city,
        stateOrCounty: address.state || undefined,
        postalOrZipCode: address.postal_code,
        countryCode: "US",
      },
    },
    items: [{
      merchantReference: id,
      sku,
      copies: 1,
      sizing: "fitPrintArea",
      attributes: { color: order.color, size: order.size },
      assets: [{ printArea: "default", url: `${origin}/api/art/${id}` }],
    }],
  };
  try {
    const response = await fetch("https://api.sandbox.prodigi.com/v4.0/Orders", {
      method: "POST",
      headers: { "X-API-Key": env.PRODIGI_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json() as Record<string, any>;
    if (!response.ok || !["created", "createdwithissues", "onhold", "alreadyexists"].includes(String(result.outcome || "").toLowerCase())) {
      throw new Error(`Prodigi rejected order: ${response.status} ${result.outcome || result.message || "unknown"}`);
    }
    await db.prepare("UPDATE orders SET status = 'submitted', prodigi_id = ?, failure = NULL WHERE id = ?")
      .bind(result.order?.id || null, id).run();
    return { status: "submitted" };
  } catch (error) {
    await db.prepare("UPDATE orders SET status = 'fulfillment_failed', failure = ? WHERE id = ?")
      .bind(String(error).slice(0, 500), id).run();
    return { status: "fulfillment_failed" };
  }
}
