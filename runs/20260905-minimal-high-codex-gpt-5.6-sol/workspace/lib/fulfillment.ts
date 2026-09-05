import type Stripe from "stripe";
import {
  PRICE_DISPLAY,
  PRODUCT_SKUS,
  getStripe,
  isShirtFit,
  isShirtSize,
  prodigiIdempotencyKey,
  signArtwork,
} from "./store";

type ShippingDetails = {
  name?: string | null;
  address?: Stripe.Address | null;
};

type ProdigiResponse = {
  outcome?: string;
  order?: { id?: string; status?: string };
  issues?: Array<{ errorCode?: string; description?: string }>;
};

export type FulfillmentResult = {
  status: "submitted" | "already_submitted";
  orderId: string;
};

function getShippingDetails(session: Stripe.Checkout.Session): ShippingDetails | null {
  const value = session as Stripe.Checkout.Session & {
    shipping_details?: ShippingDetails | null;
    collected_information?: { shipping_details?: ShippingDetails | null };
  };
  return (
    value.collected_information?.shipping_details ??
    value.shipping_details ??
    (session.customer_details?.address
      ? {
          name: session.customer_details.name,
          address: session.customer_details.address,
        }
      : null)
  );
}

function fulfillmentError(message: string, detail?: unknown) {
  if (detail) console.error("[fulfillment]", message, detail);
  return new Error(message);
}

export async function fulfillCheckoutSession(
  sessionId: string,
): Promise<FulfillmentResult> {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
    throw fulfillmentError("Payment is not complete.");
  }

  const existingOrderId = session.metadata?.prodigiOrderId;
  if (existingOrderId) {
    return { status: "already_submitted", orderId: existingOrderId };
  }

  const fit = session.metadata?.fit;
  const size = session.metadata?.size;
  const timestamp = session.metadata?.timestamp;
  const siteOrigin = session.metadata?.siteOrigin;

  if (
    !isShirtFit(fit) ||
    !isShirtSize(size) ||
    !timestamp ||
    !/^\d{13}$/.test(timestamp) ||
    !siteOrigin
  ) {
    throw fulfillmentError("Order metadata is incomplete.");
  }

  const shipping = getShippingDetails(session);
  const address = shipping?.address;
  const email = session.customer_details?.email;

  if (
    !shipping?.name ||
    !address?.line1 ||
    !address.city ||
    !address.postal_code ||
    !address.country
  ) {
    throw fulfillmentError("Shipping details are incomplete.");
  }

  const prodigiKey = process.env.PRODIGI_API_KEY;
  if (!prodigiKey) throw fulfillmentError("Prodigi is not configured.");

  const signature = signArtwork(timestamp, session.id);
  const artworkUrl = new URL("/api/artwork", siteOrigin);
  artworkUrl.searchParams.set("timestamp", timestamp);
  artworkUrl.searchParams.set("session", session.id);
  artworkUrl.searchParams.set("signature", signature);

  const orderBody = {
    merchantReference: session.id,
    idempotencyKey: prodigiIdempotencyKey(session.id),
    shippingMethod: "Budget",
    recipient: {
      name: shipping.name,
      email: email || undefined,
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
        merchantReference: `${session.id}-shirt`,
        sku: PRODUCT_SKUS[fit],
        copies: 1,
        sizing: "fitPrintArea",
        attributes: {
          color: "black",
          size: size.toLowerCase(),
        },
        recipientCost: { amount: "22.50", currency: "USD" },
        assets: [{ printArea: "front", url: artworkUrl.toString() }],
      },
    ],
  };

  const baseUrl =
    process.env.PRODIGI_BASE_URL || "https://api.sandbox.prodigi.com/v4.0";
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/Orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": prodigiKey,
    },
    body: JSON.stringify(orderBody),
    signal: AbortSignal.timeout(25_000),
  });
  const payload = (await response.json().catch(() => ({}))) as ProdigiResponse;
  const orderId = payload.order?.id;

  if (!response.ok || !orderId) {
    throw fulfillmentError("Prodigi did not accept the order.", {
      status: response.status,
      outcome: payload.outcome,
      issues: payload.issues,
    });
  }

  await stripe.checkout.sessions.update(session.id, {
    metadata: {
      ...(session.metadata || {}),
      prodigiOrderId: orderId,
      fulfillmentStatus: "submitted",
      chargedAmount: PRICE_DISPLAY,
    },
  });

  return { status: "submitted", orderId };
}
