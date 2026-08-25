import type Stripe from "stripe";
import { getShirt, type ShirtSize, type ShirtStyle } from "./catalog";
import { createArtworkSignature } from "./artwork";

type ShippingDetails = {
  name?: string | null;
  address?: Stripe.Address | null;
};

export type ProdigiOrderPayload = {
  merchantReference: string;
  shippingMethod: "Budget";
  idempotencyKey: string;
  recipient: {
    name: string;
    email: string;
    address: {
      line1: string;
      line2?: string;
      postalOrZipCode: string;
      countryCode: string;
      townOrCity: string;
      stateOrCounty?: string;
    };
  };
  items: Array<{
    merchantReference: string;
    sku: string;
    copies: 1;
    sizing: "fitPrintArea";
    attributes: { color: "black"; size: string };
    assets: Array<{ printArea: "front"; url: string }>;
  }>;
  metadata: { source: string; stripeSessionId: string };
};

export function buildProdigiOrder(session: Stripe.Checkout.Session, origin: string): ProdigiOrderPayload {
  const metadata = session.metadata || {};
  const timestamp = metadata.timestamp;
  const style = metadata.style as ShirtStyle;
  const size = metadata.size as ShirtSize;
  const collected = session.collected_information as { shipping_details?: ShippingDetails | null } | null;
  const legacy = session as Stripe.Checkout.Session & { shipping_details?: ShippingDetails | null };
  const shipping = collected?.shipping_details || legacy.shipping_details || session.customer_details;
  const address = shipping?.address;

  if (!timestamp || !style || !size || !shipping?.name || !address?.line1 || !address.city || !address.postal_code || !address.country) {
    throw new Error("Stripe Checkout Session is missing fulfillment details");
  }

  const artSignature = createArtworkSignature(timestamp);
  const artworkUrl = `${origin}/api/artwork?timestamp=${encodeURIComponent(timestamp)}&sig=${artSignature}`;

  return {
    merchantReference: `datetime-${session.id}`,
    shippingMethod: "Budget",
    idempotencyKey: session.id,
    recipient: {
      name: shipping.name,
      email: session.customer_details?.email || session.customer_email || "",
      address: {
        line1: address.line1,
        ...(address.line2 ? { line2: address.line2 } : {}),
        postalOrZipCode: address.postal_code,
        countryCode: address.country,
        townOrCity: address.city,
        ...(address.state ? { stateOrCounty: address.state } : {}),
      },
    },
    items: [{
      merchantReference: `timestamp-${timestamp}`,
      sku: getShirt(style).sku,
      copies: 1,
      sizing: "fitPrintArea",
      attributes: { color: "black", size: size.toLowerCase() },
      assets: [{ printArea: "front", url: artworkUrl }],
    }],
    metadata: { source: "datetime.store", stripeSessionId: session.id },
  };
}

export async function createProdigiOrder(payload: ProdigiOrderPayload) {
  const apiKey = process.env.PRODIGI_API_KEY;
  if (!apiKey) throw new Error("PRODIGI_API_KEY is not configured");
  const apiBase = process.env.PRODIGI_API_BASE || "https://api.sandbox.prodigi.com/v4.0";
  const response = await fetch(`${apiBase}/Orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
    body: JSON.stringify(payload),
  });
  const result = await response.json() as { outcome?: string; order?: { id?: string; status?: unknown }; issues?: unknown; detail?: string };
  const acceptedOutcome = result.outcome === "Created" || result.outcome === "AlreadyExists";
  if (!response.ok || !acceptedOutcome || !result.order?.id) {
    throw new Error(`Prodigi order failed (${response.status}): ${JSON.stringify(result.issues || result.detail || result)}`);
  }
  return result.order;
}
