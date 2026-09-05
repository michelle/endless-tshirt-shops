import Stripe from "stripe";
import { artworkUrl, isShirtSize, isShirtStyle, prodigiSku, prodigiStyle, safeTimestamp } from "./store";

type FulfillmentResult = { orderId?: string; alreadyFulfilled?: boolean; error?: string; detail?: unknown };

export async function fulfillSession(stripe: Stripe, sessionId: string, origin: string): Promise<FulfillmentResult> {
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid") return { error: "This payment is not complete yet." };

  const existingOrderId = session.metadata?.prodigi_order_id;
  if (existingOrderId) return { orderId: existingOrderId, alreadyFulfilled: true };

  const style = session.metadata?.style;
  const size = session.metadata?.size;
  if (!isShirtStyle(style) || !isShirtSize(size)) return { error: "The shirt configuration could not be verified." };

  const customer = session.customer_details;
  const address = customer?.address;
  if (!customer?.email || !customer.name || !address?.line1 || !address.city || !address.postal_code || !address.country) {
    return { error: "Your shipping details are incomplete. Please contact the shop." };
  }

  const apiKey = process.env.PRODIGI_API_KEY;
  if (!apiKey) return { error: "Fulfillment is not configured on this environment." };

  const timestampMs = safeTimestamp(session.metadata?.timestampMs);
  const prodigiResponse = await fetch("https://api.sandbox.prodigi.com/v4.0/Orders", {
    method: "POST",
    headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      shippingMethod: "Budget",
      merchantReference: `datetime-${session.id}`,
      idempotencyKey: `datetime-${session.id}`,
      recipient: {
        name: customer.name,
        email: customer.email,
        address: {
          line1: address.line1,
          line2: address.line2 || undefined,
          townOrCity: address.city,
          stateOrCounty: address.state || address.country,
          postalOrZipCode: address.postal_code,
          countryCode: address.country,
        },
      },
      items: [{
        sku: prodigiSku(style),
        copies: 1,
        sizing: "fitPrintArea",
        attributes: { brand: "Gildan", color: "black", size: size.toLowerCase(), style: prodigiStyle(style) },
        assets: [{ printArea: "default", url: artworkUrl(origin, timestampMs) }],
      }],
      metadata: { timestampMs: String(timestampMs), style, size, stripeSessionId: session.id },
    }),
  });

  const payload = await prodigiResponse.json().catch(() => ({}));
  if (!prodigiResponse.ok || !payload?.order?.id) {
    return { error: "Payment succeeded, but the print order needs attention.", detail: payload };
  }

  await stripe.checkout.sessions.update(session.id, {
    metadata: { ...(session.metadata || {}), prodigi_order_id: payload.order.id, fulfillment_environment: "sandbox" },
  });
  return { orderId: payload.order.id };
}
