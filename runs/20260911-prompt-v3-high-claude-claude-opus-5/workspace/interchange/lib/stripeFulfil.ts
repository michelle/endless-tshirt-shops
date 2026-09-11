import { fulfil } from "./fulfil";
import { getChunked } from "./meta";
import { ProdigiAddress, ProdigiOrder } from "./prodigi";
import { ShippingOptionId } from "./pricing";
import { unpack } from "./sign";
import { Spec, sanitizeSpec } from "./spec";
import { stripe } from "./stripe";

export type FulfilResult =
  | { status: "paid"; ref: string; order: ProdigiOrder; alreadyExisted: boolean }
  | { status: "unpaid" | "unknown"; ref?: string; reason: string };

function toProdigiAddress(a: any): ProdigiAddress | null {
  if (!a?.line1 || !a?.country) return null;
  return {
    line1: a.line1,
    line2: a.line2 || null,
    townOrCity: a.city || a.line2 || "",
    stateOrCounty: a.state || null,
    postalOrZipCode: a.postal_code || "",
    countryCode: a.country,
  };
}

/**
 * Idempotently turn a completed Checkout Session into a Prodigi print job.
 * Called from the Stripe webhook and again when the buyer lands on the order
 * page, so fulfilment still happens if webhook delivery is delayed.
 */
export async function fulfilStripeSession(sessionId: string): Promise<FulfilResult> {
  const session = (await stripe().checkout.sessions.retrieve(sessionId)) as any;
  const meta = (session.metadata || {}) as Record<string, string>;
  const ref = meta.ref || session.client_reference_id;

  if (!ref) return { status: "unknown", reason: "Session has no order reference." };
  if (session.payment_status !== "paid") {
    return { status: "unpaid", ref, reason: `Payment status is "${session.payment_status}".` };
  }

  const token = getChunked(meta, "spec");
  const raw = token ? unpack<Spec>(token) : null;
  if (!raw) return { status: "unknown", ref, reason: "Design could not be recovered from the session." };
  const spec = sanitizeSpec(raw);

  const collected = session.collected_information?.shipping_details || session.shipping_details;
  const address = toProdigiAddress(collected?.address || session.customer_details?.address);
  const name = collected?.name || session.customer_details?.name;
  if (!address || !name) {
    return { status: "unknown", ref, reason: "No shipping address was collected." };
  }

  const { order, alreadyExisted } = await fulfil({
    ref,
    spec,
    qty: Math.max(1, parseInt(meta.qty || "1", 10)),
    shipping: (meta.shippingOption === "express" ? "express" : "standard") as ShippingOptionId,
    origin: meta.origin || "",
    email: session.customer_details?.email || undefined,
    recipient: { name, phone: session.customer_details?.phone || undefined, address },
    paymentRef: typeof session.payment_intent === "string" ? session.payment_intent : session.id,
    amountCents: session.amount_total ?? 0,
  });

  return { status: "paid", ref, order, alreadyExisted };
}
