import type Stripe from "stripe";
import { PRODUCT, isStoreSize, prodigiSize } from "./store";
import { getStripe } from "./stripe";

type FulfillmentResult = {
  orderId: string;
  outcome: string;
  stage?: string;
  timestamp: string;
  size: string;
  alreadyExisted: boolean;
};

function getShippingDetails(session: Stripe.Checkout.Session) {
  const value = session as Stripe.Checkout.Session & {
    shipping_details?: { name?: string | null; address?: Stripe.Address | null } | null;
    collected_information?: { shipping_details?: { name?: string | null; address?: Stripe.Address | null } | null } | null;
  };
  return value.collected_information?.shipping_details ?? value.shipping_details ?? (
    session.customer_details?.name && session.customer_details.address
      ? { name: session.customer_details.name, address: session.customer_details.address }
      : null
  );
}

export async function fulfillCheckoutSession(sessionId: string): Promise<FulfillmentResult> {
  if (!/^cs_(test|live)_/.test(sessionId)) throw new Error("Invalid checkout session");
  const session = await getStripe().checkout.sessions.retrieve(sessionId, { expand: ["line_items"] });
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") throw new Error("Payment is not complete");

  const timestamp = session.metadata?.timestamp;
  const size = session.metadata?.size;
  const shipping = getShippingDetails(session);
  const address = shipping?.address;
  if (!timestamp || !/^\d{13}$/.test(timestamp) || !isStoreSize(size)) throw new Error("Order metadata is incomplete");
  if (!shipping?.name || !address?.line1 || !address.city || !address.postal_code || !address.country) throw new Error("Shipping address is incomplete");

  const apiKey = process.env.PRODIGI_API_KEY;
  if (!apiKey) throw new Error("PRODIGI_API_KEY is not configured");
  const baseUrl = process.env.PRODIGI_API_BASE_URL || "https://api.sandbox.prodigi.com/v4.0";
  const siteUrl = (process.env.SITE_URL || "").replace(/\/$/, "");
  if (!siteUrl) throw new Error("SITE_URL is not configured");

  const response = await fetch(`${baseUrl}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
    body: JSON.stringify({
      merchantReference: session.id,
      idempotencyKey: `datetime-store-${session.id}`,
      shippingMethod: "Budget",
      recipient: {
        name: shipping.name,
        email: session.customer_details?.email || undefined,
        phoneNumber: session.customer_details?.phone || undefined,
        address: {
          line1: address.line1,
          line2: address.line2 || undefined,
          postalOrZipCode: address.postal_code,
          countryCode: address.country,
          townOrCity: address.city,
          stateOrCounty: address.state || undefined,
        },
      },
      items: [{
        merchantReference: `${timestamp}-${size}`,
        sku: PRODUCT.sku,
        copies: 1,
        sizing: "fitPrintArea",
        attributes: { color: PRODUCT.color, size: prodigiSize(size) },
        recipientCost: { amount: (PRODUCT.unitAmount / 100).toFixed(2), currency: "USD" },
        assets: [{ printArea: "front", url: `${siteUrl}/api/artwork/${timestamp}` }],
      }],
      metadata: { stripeCheckoutSession: session.id, timestamp, size, environment: "sandbox" },
    }),
    cache: "no-store",
  });

  const payload = await response.json() as { outcome?: string; order?: { id?: string; status?: { stage?: string } }; issues?: unknown[] };
  if (!response.ok || !payload.order?.id) {
    console.error("Prodigi fulfillment failed", response.status, payload.outcome, payload.issues);
    throw new Error("Print fulfillment could not be created");
  }

  return {
    orderId: payload.order.id,
    outcome: payload.outcome || "Created",
    stage: payload.order.status?.stage,
    timestamp,
    size,
    alreadyExisted: payload.outcome?.toLowerCase() === "alreadyexists",
  };
}
