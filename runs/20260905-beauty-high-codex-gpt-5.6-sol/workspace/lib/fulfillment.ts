import type Stripe from "stripe";
import { PRODUCT, type ProductSize, toProdigiSize } from "./product";
import { getStripe } from "./stripe";

type ProdigiResult = {
  outcome?: string;
  order?: { id?: string; status?: { stage?: string } };
  error?: { message?: string };
  issues?: Array<{ description?: string }>;
};

function getShipping(session: Stripe.Checkout.Session) {
  const shipping = session.collected_information?.shipping_details;
  const customer = session.customer_details;
  const address = shipping?.address ?? customer?.address;
  if (!address || !address.line1 || !address.city || !address.postal_code || !address.country) {
    throw new Error("The checkout session does not contain a complete shipping address.");
  }

  return {
    name: shipping?.name || customer?.name || "datetime.store customer",
    email: customer?.email || undefined,
    phoneNumber: customer?.phone || undefined,
    address: {
      line1: address.line1,
      line2: address.line2 || undefined,
      postalOrZipCode: address.postal_code,
      countryCode: address.country,
      townOrCity: address.city,
      stateOrCounty: address.state || undefined,
    },
  };
}

export async function fulfillCheckout(sessionId: string) {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status === "unpaid") {
    return { state: "unpaid" as const, session };
  }

  if (session.metadata?.prodigi_order_id) {
    return {
      state: "fulfilled" as const,
      prodigiOrderId: session.metadata.prodigi_order_id,
      session,
      duplicate: true,
    };
  }

  const apiKey = process.env.PRODIGI_API_KEY;
  if (!apiKey) throw new Error("Prodigi is not configured.");

  const timestamp = Number(session.metadata?.timestamp);
  const quantity = Number(session.metadata?.quantity);
  const size = session.metadata?.size as ProductSize;
  const artworkUrl = session.metadata?.artwork_url;

  if (!timestamp || !quantity || !PRODUCT.allowedSizes.includes(size) || !artworkUrl) {
    throw new Error("The order is missing fulfillment metadata.");
  }

  const response = await fetch("https://api.sandbox.prodigi.com/v4.0/Orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify({
      merchantReference: session.id,
      idempotencyKey: session.id,
      shippingMethod: "Budget",
      recipient: getShipping(session),
      items: [{
        sku: PRODUCT.sku,
        copies: quantity,
        sizing: "fitPrintArea",
        attributes: { color: PRODUCT.color, size: toProdigiSize(size) },
        assets: [{ printArea: "front", url: artworkUrl }],
      }],
      metadata: {
        stripeSessionId: session.id,
        timestamp: String(timestamp),
        storefront: "datetime.store",
      },
    }),
  });

  const result = (await response.json().catch(() => ({}))) as ProdigiResult;
  if (!response.ok || !result.order?.id) {
    const message = result.error?.message || result.issues?.map((issue) => issue.description).filter(Boolean).join(" ") || `Prodigi returned ${response.status}.`;
    throw new Error(`Fulfillment could not be submitted: ${message}`);
  }

  await stripe.checkout.sessions.update(session.id, {
    metadata: { ...session.metadata, prodigi_order_id: result.order.id },
  });

  return {
    state: "fulfilled" as const,
    prodigiOrderId: result.order.id,
    prodigiStage: result.order.status?.stage || "Submitted",
    session,
    duplicate: false,
  };
}
