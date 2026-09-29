// Prodigi Print API v4 client (sandbox base URL; same shape for live).

import type Stripe from "stripe";
import { designFromMetadata, encodeDesign } from "./design";
import { signPayload } from "./sign";

const PRODIGI_BASE = process.env.PRODIGI_API_BASE ?? "https://api.sandbox.prodigi.com";
const TEE_SKU = "GLOBAL-TEE-GIL-5000"; // Gildan 5000 unisex heavy cotton tee

export interface FulfillResult {
  alreadyFulfilled: boolean;
  prodigiOrderId?: string;
  artworkUrl?: string;
}

function apiKey(): string {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) throw new Error("PRODIGI_API_KEY is not configured");
  return key;
}

export function artworkUrlFor(designMeta: string, baseUrl: string): string {
  const design = designFromMetadata(designMeta);
  const payload = encodeDesign(design);
  const sig = signPayload(payload);
  return `${baseUrl}/api/artwork?p=${encodeURIComponent(payload)}&sig=${sig}`;
}

/**
 * Send a paid Stripe Checkout session to Prodigi for printing + shipping.
 * Idempotent: the Prodigi order id is recorded on the session's metadata and
 * the Stripe session id is used as both merchantReference and Prodigi
 * idempotency key.
 */
export async function fulfillSession(sessionId: string, baseUrl: string): Promise<FulfillResult> {
  const { stripe } = await import("./stripe");
  const session = await stripe().checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== "paid") {
    throw new Error(`Session ${sessionId} is not paid (status: ${session.payment_status})`);
  }

  if (session.metadata?.fulfilled) {
    return { alreadyFulfilled: true, prodigiOrderId: session.metadata.fulfilled };
  }

  const designMeta = session.metadata?.design;
  if (!designMeta) throw new Error(`Session ${sessionId} has no design metadata`);
  const design = designFromMetadata(designMeta);
  const artworkUrl = artworkUrlFor(designMeta, baseUrl);

  const shipping: Stripe.Address | undefined =
    session.shipping_details?.address ?? session.customer_details?.address ?? undefined;
  const name: string =
    session.shipping_details?.name ?? session.customer_details?.name ?? "Customer";
  if (!shipping?.line1 || !shipping.city || !shipping.postal_code || !shipping.country) {
    throw new Error(`Session ${sessionId} is missing a complete shipping address`);
  }

  const orderBody = {
    merchantReference: session.id,
    shippingMethod: "Standard",
    idempotencyKey: session.id,
    recipient: {
      name,
      email: session.customer_details?.email ?? undefined,
      address: {
        line1: shipping.line1,
        line2: shipping.line2 ?? undefined,
        postalOrZipCode: shipping.postal_code,
        countryCode: shipping.country,
        townOrCity: shipping.city,
        stateOrCounty: shipping.state ?? undefined,
      },
    },
    items: [
      {
        sku: TEE_SKU,
        copies: 1,
        sizing: "fillPrintArea",
        attributes: { color: design.color, size: design.size },
        assets: [{ printArea: "front", url: artworkUrl }],
      },
    ],
  };

  const res = await fetch(`${PRODIGI_BASE}/v4.0/orders`, {
    method: "POST",
    headers: {
      "X-API-Key": apiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(orderBody),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Prodigi order failed (${res.status}): ${JSON.stringify(data).slice(0, 500)}`);
  }

  const prodigiOrderId: string | undefined = data?.order?.id;
  await stripe().checkout.sessions.update(session.id, {
    metadata: { fulfilled: prodigiOrderId ?? "unknown" },
  });

  return { alreadyFulfilled: false, prodigiOrderId, artworkUrl };
}
