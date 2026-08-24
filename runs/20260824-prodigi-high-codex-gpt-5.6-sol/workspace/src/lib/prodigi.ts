import "server-only";
import type Stripe from "stripe";
import { canonicalOrigin, prodigiApiKey, prodigiBaseUrl } from "@/lib/env";
import { createArtworkToken } from "@/lib/artwork";
import { shirtConfig, type ShirtSize, type ShirtStyle } from "@/lib/products";
import { stripe } from "@/lib/stripe";

type ProdigiResponse = {
  outcome: string;
  order?: { id?: string; status?: { stage?: string; issues?: unknown[] } };
  description?: string;
  issues?: unknown[];
  traceParent?: string;
};

function checkoutShipping(session: Stripe.Checkout.Session) {
  return session.collected_information?.shipping_details;
}

export async function fulfillCheckoutSession(
  sessionId: string,
  origin?: string,
): Promise<{ orderId: string; outcome: string }> {
  const client = stripe();
  const session = await client.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== "paid") {
    throw new Error(`Checkout session ${sessionId} is not paid`);
  }

  if (session.metadata?.prodigi_order_id) {
    return {
      orderId: session.metadata.prodigi_order_id,
      outcome: session.metadata.prodigi_outcome ?? "AlreadyFulfilled",
    };
  }

  const style = session.metadata?.style as ShirtStyle | undefined;
  const size = session.metadata?.size as ShirtSize | undefined;
  const timestamp = session.metadata?.timestamp;
  const shipping = checkoutShipping(session);
  const address = shipping?.address;

  if (!style || !shirtConfig[style] || !size || !timestamp || !address || !shipping?.name) {
    throw new Error(`Checkout session ${sessionId} is missing fulfillment data`);
  }

  const artworkToken = createArtworkToken(timestamp);
  const siteOrigin = canonicalOrigin(origin);
  const response = await fetch(`${prodigiBaseUrl()}/v4.0/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": prodigiApiKey(),
    },
    body: JSON.stringify({
      merchantReference: session.id,
      idempotencyKey: `datetime-store-${session.id}`,
      shippingMethod: "Budget",
      callbackUrl: `${siteOrigin}/api/prodigi/callback`,
      recipient: {
        name: shipping.name,
        email: session.customer_details?.email ?? undefined,
        phoneNumber: session.customer_details?.phone ?? undefined,
        address: {
          line1: address.line1,
          line2: address.line2 || undefined,
          postalOrZipCode: address.postal_code,
          countryCode: address.country,
          townOrCity: address.city,
          stateOrCounty: address.state || undefined,
        },
      },
      items: [
        {
          merchantReference: `${session.id}-shirt`,
          sku: shirtConfig[style].prodigiSku,
          copies: 1,
          sizing: "fillPrintArea",
          attributes: { color: "black", size: size.toLowerCase() },
          assets: [
            {
              printArea: "front",
              url: `${siteOrigin}/api/artwork/${artworkToken}.png`,
            },
          ],
        },
      ],
      metadata: {
        stripeCheckoutSession: session.id,
        timestamp,
        style,
        size,
      },
    }),
    signal: AbortSignal.timeout(25_000),
  });

  const payload = (await response.json().catch(() => null)) as ProdigiResponse | null;
  const orderId = payload?.order?.id;
  if (!response.ok || !payload || !orderId) {
    const detail = payload?.description || payload?.outcome || `HTTP ${response.status}`;
    throw new Error(`Prodigi order failed: ${detail}`);
  }

  await client.checkout.sessions.update(session.id, {
    metadata: {
      ...session.metadata,
      prodigi_order_id: orderId,
      prodigi_outcome: payload.outcome,
    },
  });

  return { orderId, outcome: payload.outcome };
}
