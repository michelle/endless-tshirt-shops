import type Stripe from "stripe";
import { artworkPath, describeTimestamp } from "./artwork";
import { publicBaseUrl } from "./base-url";
import { createOrder, ProdigiError } from "./prodigi";
import { isSize, isStyle, PRODIGI_SIZE, SHIPPING_COUNTRIES, SHIRT_COLOR, STYLE_INFO } from "./products";
import { stripe } from "./stripe";

/** Keys we store on the PaymentIntent. The PaymentIntent is our order record; there is no separate database. */
export const META = {
  style: "style",
  size: "size",
  timestamp: "timestamp",
  prodigiOrderId: "prodigi_order_id",
  prodigiOutcome: "prodigi_outcome",
  fulfillmentError: "fulfillment_error",
  fulfillmentAttemptedAt: "fulfillment_attempted_at",
} as const;

export type FulfillmentResult =
  | { status: "unpaid"; paymentStatus: Stripe.PaymentIntent.Status }
  | { status: "fulfilled"; orderId: string; timestamp: number }
  | { status: "failed"; message: string; timestamp: number };

/**
 * Turn a paid PaymentIntent into a Prodigi order. Safe to call any number of
 * times from any number of places (webhook, client poll): the Prodigi
 * idempotency key is the PaymentIntent id, and the resulting order id is
 * written back onto the PaymentIntent so later calls short-circuit.
 */
export async function fulfillPaymentIntent(pi: Stripe.PaymentIntent, requestOrigin?: string | null): Promise<FulfillmentResult> {
  const timestamp = Number(pi.metadata[META.timestamp]);

  if (pi.status !== "succeeded") {
    return { status: "unpaid", paymentStatus: pi.status };
  }
  if (pi.metadata[META.prodigiOrderId]) {
    return { status: "fulfilled", orderId: pi.metadata[META.prodigiOrderId], timestamp };
  }

  const style = pi.metadata[META.style];
  const size = pi.metadata[META.size];
  const shipping = pi.shipping;
  if (!isStyle(style) || !isSize(size) || !Number.isInteger(timestamp) || !shipping?.address) {
    const message = "PaymentIntent is missing shirt or shipping details";
    await recordFailure(pi.id, message);
    return { status: "failed", message, timestamp };
  }

  const email = pi.receipt_email ?? undefined;
  const address = shipping.address;
  if (!address.line1 || !address.city || !address.postal_code || !(SHIPPING_COUNTRIES as readonly string[]).includes(address.country ?? "")) {
    const message = `Shipping address is incomplete or outside ${SHIPPING_COUNTRIES.join(", ")}; needs manual handling`;
    await recordFailure(pi.id, message);
    return { status: "failed", message, timestamp };
  }
  const artworkUrl = `${publicBaseUrl(requestOrigin)}${artworkPath(timestamp)}`;

  try {
    const res = await createOrder({
      merchantReference: pi.id,
      idempotencyKey: pi.id,
      shippingMethod: "Standard",
      // Prodigi rejects optional fields that are present but empty ("" fails
      // MustNotBeEmptyOrWhitespace), and Stripe stores blanks as "".
      recipient: {
        name: shipping.name || "Customer",
        email: nonEmpty(email),
        phoneNumber: nonEmpty(shipping.phone),
        address: {
          line1: address.line1 ?? "",
          line2: nonEmpty(address.line2),
          townOrCity: address.city ?? "",
          stateOrCounty: nonEmpty(address.state),
          postalOrZipCode: address.postal_code ?? "",
          countryCode: address.country ?? "US",
        },
      },
      items: [
        {
          merchantReference: `datetime-${timestamp}-${style}-${size}`,
          sku: STYLE_INFO[style].sku,
          copies: 1,
          sizing: "fitPrintArea",
          attributes: { color: SHIRT_COLOR, size: PRODIGI_SIZE[size] },
          assets: [{ printArea: "front", url: artworkUrl }],
        },
      ],
      metadata: {
        stripe_payment_intent: pi.id,
        datetime: describeTimestamp(timestamp),
      },
    });

    const orderId = res.order!.id;
    await stripe().paymentIntents.update(pi.id, {
      metadata: {
        [META.prodigiOrderId]: orderId,
        [META.prodigiOutcome]: res.outcome,
        [META.fulfillmentError]: "",
        [META.fulfillmentAttemptedAt]: new Date().toISOString(),
      },
    });
    console.log(`[fulfill] ${pi.id} -> Prodigi ${orderId} (${res.outcome})`);
    return { status: "fulfilled", orderId, timestamp };
  } catch (err) {
    const message = err instanceof ProdigiError ? `${err.message}: ${JSON.stringify(err.body).slice(0, 400)}` : err instanceof Error ? err.message : String(err);
    console.error(`[fulfill] ${pi.id} failed:`, message);
    await recordFailure(pi.id, message);
    return { status: "failed", message, timestamp };
  }
}

function nonEmpty(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

async function recordFailure(paymentIntentId: string, message: string) {
  try {
    await stripe().paymentIntents.update(paymentIntentId, {
      metadata: {
        [META.fulfillmentError]: message.slice(0, 480),
        [META.fulfillmentAttemptedAt]: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("[fulfill] could not record failure on PaymentIntent", err);
  }
}
