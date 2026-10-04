import type Stripe from "stripe";
import { stripe } from "./stripe";
import { itemsFromMetadata } from "./orders";
import { createOrder, PermanentError, type Recipient } from "./prodigi";

export type FulfillResult =
  | { state: "unpaid" }
  | { state: "fulfilled"; prodigiOrderId: string }
  | { state: "failed"; reason: string };

function recipientFrom(s: Stripe.Checkout.Session): Recipient {
  const info: any = (s as any).collected_information?.shipping_details ?? (s as any).shipping_details;
  const a = info?.address;
  if (!info || !a?.line1 || !a?.country) throw new PermanentError("Session has no shipping address");
  return {
    name: info.name || s.customer_details?.name || "Customer",
    email: s.customer_details?.email,
    phone: s.customer_details?.phone,
    address: {
      line1: a.line1, line2: a.line2 || null, townOrCity: a.city || "", stateOrCounty: a.state || null,
      postalOrZipCode: a.postal_code || "", countryCode: a.country,
    },
  };
}

/**
 * Sends a paid Checkout Session to Prodigi. Safe to call repeatedly (webhook retries, success-page
 * fallback): the session must be paid, and Prodigi dedupes on idempotencyKey = session id.
 */
export async function fulfillSession(sessionId: string, origin: string): Promise<FulfillResult> {
  const s = await stripe().checkout.sessions.retrieve(sessionId);
  if (s.payment_status !== "paid") return { state: "unpaid" };
  if (s.metadata?.prodigi_order) return { state: "fulfilled", prodigiOrderId: s.metadata.prodigi_order };

  try {
    const items = itemsFromMetadata(s.metadata);
    if (!items) throw new PermanentError("Session metadata has no valid items");
    const order = await createOrder({
      reference: s.id,
      recipient: recipientFrom(s),
      items: items.map((item, i) => ({
        reference: `${s.id.slice(-12)}-${i}`,
        item,
        printUrl: `${origin}/api/print/${s.id}/${i}.png`,
      })),
    });
    await stripe().checkout.sessions.update(s.id, { metadata: { prodigi_order: order.id } }).catch((e) => console.error("could not record prodigi id", e?.message));
    console.log(`fulfilled ${s.id} -> ${order.id} (${order.outcome})`);
    return { state: "fulfilled", prodigiOrderId: order.id };
  } catch (e: any) {
    if (e instanceof PermanentError) {
      console.error(`FULFILLMENT FAILED (needs manual action / refund) ${s.id}: ${e.message}`);
      await stripe().checkout.sessions.update(s.id, { metadata: { fulfillment_error: e.message.slice(0, 450) } }).catch(() => {});
      return { state: "failed", reason: e.message };
    }
    throw e; // transient: let the webhook return 5xx so Stripe retries
  }
}
