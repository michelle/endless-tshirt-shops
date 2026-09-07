import "server-only";
import type Stripe from "stripe";
import { createOrder, findOrderByMerchantReference, validateItems, type Address, type ProdigiOrder } from "./prodigi";

// Creates the Prodigi order for a paid Stripe Checkout session. Idempotent: the session id is the
// merchant reference and Prodigi idempotency key, so webhook retries and the success page can both call it.
export async function fulfilStripeSession(session: Stripe.Checkout.Session): Promise<ProdigiOrder> {
  if (session.payment_status !== "paid") throw new Error(`Session ${session.id} is not paid`);
  const existing = await findOrderByMerchantReference(session.id);
  if (existing) return existing;
  const items = validateItems(JSON.parse(session.metadata?.items ?? "[]"));
  const address = JSON.parse(session.metadata?.address ?? "{}") as Address;
  const siteUrl = process.env.SITE_URL ?? (session.success_url ? new URL(session.success_url).origin : "");
  return createOrder({ items, address, merchantReference: session.id, idempotencyKey: session.id, siteUrl });
}
