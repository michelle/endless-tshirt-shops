import "server-only";
import type Stripe from "stripe";
import { PRODUCT_BY_FIT, selectionFromMetadata } from "./catalog";

type ShippingDetails = {
  name?: string | null;
  address?: Stripe.Address | null;
};

type CheckoutWithShipping = Stripe.Checkout.Session & {
  shipping_details?: ShippingDetails | null;
  collected_information?: { shipping_details?: ShippingDetails | null } | null;
};

export type ProdigiResult = {
  id: string;
  outcome: string;
  stage?: string;
};

export async function createProdigiOrder(session: Stripe.Checkout.Session, siteUrl: string): Promise<ProdigiResult> {
  const apiKey = process.env.PRODIGI_API_KEY;
  if (!apiKey) throw new Error("PRODIGI_API_KEY is not configured.");

  const selection = selectionFromMetadata(session.metadata);
  const product = PRODUCT_BY_FIT[selection.fit];
  const checkout = session as CheckoutWithShipping;
  const shipping = checkout.collected_information?.shipping_details || checkout.shipping_details;
  const address = shipping?.address;
  if (!shipping?.name || !address?.line1 || !address.city || !address.postal_code || !address.country) {
    throw new Error("Checkout Session is missing a complete shipping address.");
  }

  const payload = {
    merchantReference: `datetime-${session.id}`,
    idempotencyKey: session.id,
    shippingMethod: "Standard",
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
        stateOrCounty: address.state || undefined
      }
    },
    items: [
      {
        merchantReference: `timestamp-${selection.timestamp}`,
        sku: product.sku,
        copies: 1,
        sizing: "fitPrintArea",
        attributes: { color: "black", size: selection.size.toLowerCase() },
        recipientCost: { amount: "22.50", currency: "USD" },
        assets: [
          {
            printArea: "front",
            url: `${siteUrl}/api/artwork/${selection.timestamp}.png`
          }
        ]
      }
    ],
    metadata: {
      stripeCheckoutSessionId: session.id,
      capturedTimestamp: selection.timestamp,
      fit: selection.fit,
      size: selection.size
    }
  };

  const apiUrl = process.env.PRODIGI_API_URL || "https://api.sandbox.prodigi.com/v4.0";
  const response = await fetch(`${apiUrl}/Orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(25_000)
  });
  const result = (await response.json()) as {
    outcome?: string;
    order?: { id?: string; status?: { stage?: string }; statusCode?: number };
    details?: string;
    issues?: unknown;
  };

  if (!response.ok || !result.order?.id) {
    console.error("Prodigi order failed", { status: response.status, outcome: result.outcome, details: result.details, issues: result.issues });
    throw new Error(`Prodigi rejected the order (${response.status}, ${result.outcome || "unknown outcome"}).`);
  }

  return { id: result.order.id, outcome: result.outcome || "Created", stage: result.order.status?.stage };
}
