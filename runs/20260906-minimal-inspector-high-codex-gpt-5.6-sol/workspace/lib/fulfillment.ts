import type Stripe from "stripe";
import { fits, PRICE_CENTS, prodigiSize, sizes, type Fit, type Size } from "./catalog";
import { prodigiApiBase, prodigiApiKey, siteUrl } from "./env";
import { signArtwork } from "./artwork";
import { getStripe } from "./stripe";

type ProdigiOrderResponse = {
  outcome?: string;
  order?: { id?: string; status?: { stage?: string } };
  details?: string;
  issues?: Array<{ description?: string }>;
};

export type FulfillmentResult = {
  orderId: string;
  stage: string;
};

function paymentIntentId(session: Stripe.Checkout.Session) {
  if (typeof session.payment_intent === "string") return session.payment_intent;
  return session.payment_intent?.id;
}

export async function fulfillCheckout(session: Stripe.Checkout.Session): Promise<FulfillmentResult> {
  if (session.payment_status !== "paid") throw new Error("Checkout has not been paid.");

  const stripe = getStripe();
  const intentId = paymentIntentId(session);
  if (!intentId) throw new Error("Checkout has no payment intent.");

  const intent = await stripe.paymentIntents.retrieve(intentId);
  if (intent.metadata.prodigi_order_id) {
    return {
      orderId: intent.metadata.prodigi_order_id,
      stage: intent.metadata.prodigi_stage || "InProgress",
    };
  }

  const fit = session.metadata?.fit as Fit | undefined;
  const size = session.metadata?.size as Size | undefined;
  const timestamp = Number(session.metadata?.timestamp);
  if (!fit || !(fit in fits) || !size || !sizes.includes(size) || !Number.isSafeInteger(timestamp)) {
    throw new Error("Checkout product metadata is invalid.");
  }
  const validFit: Fit = fit;
  const validSize: Size = size;
  const product = fits[validFit];

  const shipping = session.collected_information?.shipping_details;
  const address = shipping?.address;
  if (!shipping || !address?.line1 || !address.postal_code || !address.country || !address.city) {
    throw new Error("Checkout has no complete shipping address.");
  }

  const signature = signArtwork(timestamp, validFit, validSize);
  const artworkUrl = new URL("/api/artwork", siteUrl());
  artworkUrl.searchParams.set("timestamp", String(timestamp));
  artworkUrl.searchParams.set("fit", validFit);
  artworkUrl.searchParams.set("size", validSize);
  artworkUrl.searchParams.set("signature", signature);

  const response = await fetch(`${prodigiApiBase()}/v4.0/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": prodigiApiKey(),
    },
    body: JSON.stringify({
      merchantReference: session.id,
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
          stateOrCounty: address.state || undefined,
        },
      },
      items: [
        {
          merchantReference: `datetime-${timestamp}`,
          sku: product.sku,
          copies: 1,
          sizing: "fitPrintArea",
          attributes: {
            color: product.attributes.color,
            size: prodigiSize(validSize),
          },
          recipientCost: {
            amount: (PRICE_CENTS / 100).toFixed(2),
            currency: "USD",
          },
          assets: [{ printArea: "front", url: artworkUrl.toString() }],
        },
      ],
      metadata: {
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: intentId,
        datetime: timestamp,
        fit: validFit,
        size: validSize,
      },
    }),
    signal: AbortSignal.timeout(20_000),
  });

  const payload = (await response.json()) as ProdigiOrderResponse;
  const orderId = payload.order?.id;
  if (!response.ok || !orderId) {
    const issue = payload.issues?.map((entry) => entry.description).filter(Boolean).join("; ");
    throw new Error(`Prodigi rejected the order${issue || payload.details ? `: ${issue || payload.details}` : "."}`);
  }

  const stage = payload.order?.status?.stage || "Created";
  await stripe.paymentIntents.update(intentId, {
    metadata: {
      prodigi_order_id: orderId,
      prodigi_stage: stage,
      datetime: String(timestamp),
      fit: validFit,
      size: validSize,
    },
  });

  return { orderId, stage };
}
