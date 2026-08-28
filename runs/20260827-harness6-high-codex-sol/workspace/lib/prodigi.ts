import type Stripe from "stripe";
import { getStripe } from "./stripe";

const SKU = {
  fitted: "GLOBAL-TEE-BC-6004",
  unisex: "GLOBAL-TEE-BC-3001",
} as const;
const PRODIGI_API_BASE_URL = process.env.PRODIGI_API_BASE_URL || "https://api.sandbox.prodigi.com/v4.0";

type FulfillmentResult = { orderId: string; alreadyFulfilled: boolean };

export async function fulfillCheckoutSession(sessionOrId: Stripe.Checkout.Session | string): Promise<FulfillmentResult> {
  const stripe = getStripe();
  const session = typeof sessionOrId === "string" ? await stripe.checkout.sessions.retrieve(sessionOrId) : sessionOrId;
  if (session.payment_status !== "paid") throw new Error("Checkout Session has not been paid");
  if (session.metadata?.prodigi_order_id) return { orderId: session.metadata.prodigi_order_id, alreadyFulfilled: true };

  const fit = session.metadata?.fit === "unisex" ? "unisex" : "fitted";
  const size = ["s", "m", "l", "xl"].includes(session.metadata?.size || "") ? session.metadata!.size! : "m";
  const timestamp = session.metadata?.timestamp;
  const origin = session.metadata?.origin;
  const shipping = session.collected_information?.shipping_details;
  const address = shipping?.address;
  const apiKey = process.env.PRODIGI_API_KEY;
  if (!timestamp || !origin || !shipping || !address || !apiKey) throw new Error("Fulfillment details are incomplete");

  const prodigiResponse = await fetch(`${PRODIGI_API_BASE_URL}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
    body: JSON.stringify({
      merchantReference: session.id,
      idempotencyKey: `datetime-${session.id}`,
      shippingMethod: "Budget",
      callbackUrl: `${origin}/api/prodigi/callback`,
      recipient: {
        name: shipping.name || session.customer_details?.name || "datetime.store customer",
        email: session.customer_details?.email || undefined,
        phoneNumber: session.customer_details?.phone || undefined,
        address: {
          line1: address.line1,
          line2: address.line2 || "N/A",
          postalOrZipCode: address.postal_code,
          countryCode: address.country,
          townOrCity: address.city,
          stateOrCounty: address.state || "N/A",
        },
      },
      items: [{
        merchantReference: `${fit}-${size}-${timestamp}`,
        sku: SKU[fit],
        copies: 1,
        sizing: "fitPrintArea",
        attributes: { color: "black", size },
        recipientCost: { amount: "22.50", currency: "USD" },
        assets: [{ printArea: "front", url: `${origin}/api/artwork/${timestamp}` }],
      }],
      metadata: { timestamp, fit, size, stripeCheckoutSession: session.id },
    }),
  });

  const payload = await prodigiResponse.json();
  if (!prodigiResponse.ok || !payload.order?.id) {
    const firstFailure = payload?.failures && Object.entries(payload.failures)[0] as [string, Array<{ code?: string }>] | undefined;
    const issue = payload?.order?.status?.issues?.[0]?.description || payload?.details || (firstFailure ? `${firstFailure[0]}: ${firstFailure[1]?.[0]?.code || "invalid"}` : null) || payload?.outcome || "Prodigi rejected the order";
    throw new Error(String(issue));
  }

  const orderId = payload.order.id as string;
  await stripe.checkout.sessions.update(session.id, { metadata: { ...session.metadata, prodigi_order_id: orderId } });
  return { orderId, alreadyFulfilled: false };
}
