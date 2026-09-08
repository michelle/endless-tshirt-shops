// Bridges a paid Stripe Checkout Session to a Prodigi order.
import type Stripe from "stripe";
import { decodeItems } from "./cart-items";
import { createOrder, type ProdigiOrder, type ProdigiRecipient } from "./prodigi";
import { stripe } from "./stripe";

/** Tag written into every Checkout Session's metadata so the webhook can ignore unrelated sessions. */
export const STORE_TAG = "obsolete-futures";

export class NotOurSessionError extends Error {
  constructor(id: string) {
    super(`Session ${id} was not created by this store`);
  }
}

export const SHIPPING = {
  standard: { label: "Standard (5–10 business days)", amount: 595, prodigi: "Standard" as const },
  express: { label: "Express (2–4 business days)", amount: 1495, prodigi: "Express" as const },
};

export async function retrieveSession(sessionId: string): Promise<Stripe.Checkout.Session> {
  return stripe().checkout.sessions.retrieve(sessionId, { expand: ["shipping_cost.shipping_rate"] });
}

function recipientFromSession(session: Stripe.Checkout.Session): ProdigiRecipient {
  const ship = session.collected_information?.shipping_details;
  const addr = ship?.address;
  if (!ship || !addr || !addr.line1 || !addr.city || !addr.postal_code || !addr.country) {
    throw new Error("Checkout session has no complete shipping address");
  }
  return {
    name: ship.name || session.customer_details?.name || "Customer",
    email: session.customer_details?.email || undefined,
    phoneNumber: session.customer_details?.phone || undefined,
    address: {
      line1: addr.line1,
      line2: addr.line2 || undefined,
      townOrCity: addr.city,
      stateOrCounty: addr.state || undefined,
      postalOrZipCode: addr.postal_code,
      countryCode: addr.country,
    },
  };
}

/**
 * Idempotently creates the Prodigi order for a paid session. Called from both the
 * Stripe webhook and the success page, whichever arrives first; Prodigi's
 * idempotencyKey guarantees exactly one order per session.
 */
export async function fulfilSession(session: Stripe.Checkout.Session): Promise<{ outcome: string; order: ProdigiOrder }> {
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
    throw new Error(`Session ${session.id} is not paid (${session.payment_status})`);
  }
  if (session.metadata?.store !== STORE_TAG) throw new NotOurSessionError(session.id);
  const items = decodeItems(session.metadata?.items || "");
  if (items.length === 0) throw new Error(`Session ${session.id} has no items in metadata`);

  const rate = session.shipping_cost?.shipping_rate;
  const rateMeta = rate && typeof rate !== "string" ? rate.metadata : undefined;
  const method = rateMeta?.prodigi === "Express" ? "Express" : "Standard";

  return createOrder({
    merchantReference: session.id,
    idempotencyKey: session.id,
    shippingMethod: method,
    recipient: recipientFromSession(session),
    items,
    metadata: {
      stripeSessionId: session.id,
      stripePaymentIntent: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || "",
    },
  });
}
