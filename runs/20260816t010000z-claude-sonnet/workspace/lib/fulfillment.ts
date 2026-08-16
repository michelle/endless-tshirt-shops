import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { generateArtworkPng } from "@/lib/artwork";
import { createDesign, createOrder, createQuote, ScalablePressError } from "@/lib/scalablepress";
import {
  SP_COLOR,
  SP_PRODUCTS,
  SP_SIZES,
  isShirtSize,
  isShirtStyle,
} from "@/lib/products";

// Entry point used by both the webhook and the order-status polling route.
// Whichever fires first wins: it takes a soft lock by marking the
// PaymentIntent "processing" before doing any work, so a webhook delivery
// racing a poll from the success page can't fulfill (and charge Scalable
// Press for) the same order twice.
export async function ensureFulfilled(session: Stripe.Checkout.Session): Promise<void> {
  if (session.payment_status !== "paid") return;

  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  if (!paymentIntentId) return;

  const paymentIntent =
    typeof session.payment_intent === "string"
      ? await stripe.paymentIntents.retrieve(paymentIntentId)
      : session.payment_intent;

  if (paymentIntent?.metadata?.fulfillment_status) return;

  try {
    await stripe.paymentIntents.update(paymentIntentId, {
      metadata: { fulfillment_status: "processing" },
    });
  } catch (err) {
    console.error("[fulfillment] failed to take lock for", paymentIntentId, err);
    return;
  }

  await fulfillCheckoutSession(session, paymentIntentId);
}

// Places the print/ship order with Scalable Press, then records the result
// on the PaymentIntent so the success page (and support tooling) can look it
// up by session id later.
async function fulfillCheckoutSession(
  session: Stripe.Checkout.Session,
  paymentIntentId: string
): Promise<void> {
  const style = session.metadata?.style;
  const size = session.metadata?.size;
  const timestamp = Number(session.metadata?.timestamp);

  if (!isShirtStyle(style) || !isShirtSize(size) || !Number.isFinite(timestamp)) {
    await markFailed(paymentIntentId, "Missing or invalid order metadata.");
    return;
  }

  const shipping = session.shipping_details || session.customer_details;
  const address = shipping?.address;
  if (!address || !address.line1 || !address.city || !address.state || !address.postal_code) {
    await markFailed(paymentIntentId, "Missing shipping address.");
    return;
  }

  try {
    const artwork = await generateArtworkPng(timestamp);
    const designId = await createDesign(artwork);
    const orderToken = await createQuote({
      designId,
      productId: SP_PRODUCTS[style],
      color: SP_COLOR,
      size: SP_SIZES[size],
      address: {
        name: shipping?.name || session.customer_details?.name || "Customer",
        address1: address.line1,
        address2: address.line2 || undefined,
        city: address.city,
        state: address.state || "",
        zip: address.postal_code,
        country: address.country || "US",
      },
    });
    const spOrderId = await createOrder(orderToken);

    await stripe.paymentIntents.update(paymentIntentId, {
      metadata: {
        fulfillment_status: "fulfilled",
        sp_order_id: spOrderId,
      },
    });
  } catch (err) {
    const message =
      err instanceof ScalablePressError
        ? `${err.message}${err.issues?.length ? `: ${JSON.stringify(err.issues)}` : ""}`
        : err instanceof Error
        ? err.message
        : "Unknown fulfillment error.";
    console.error("[fulfillment] failed for session", session.id, message);
    await markFailed(paymentIntentId, message);
    await refund(paymentIntentId);
  }
}

async function markFailed(paymentIntentId: string, message: string): Promise<void> {
  await stripe.paymentIntents.update(paymentIntentId, {
    metadata: {
      fulfillment_status: "failed",
      fulfillment_error: message.slice(0, 490),
    },
  });
}

async function refund(paymentIntentId: string): Promise<void> {
  try {
    await stripe.refunds.create({ payment_intent: paymentIntentId, reason: "requested_by_customer" });
    await stripe.paymentIntents.update(paymentIntentId, {
      metadata: { fulfillment_status: "refunded" },
    });
  } catch (err) {
    console.error("[fulfillment] refund also failed for", paymentIntentId, err);
  }
}
