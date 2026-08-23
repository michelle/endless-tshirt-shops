import type Stripe from "stripe";
import { getStripe } from "./stripe";
import { sendToScalablePress } from "./scalable-press";
import { PRODUCTS, SIZES, type Fit, type Size } from "./product";

const validFit = (value: string | undefined): value is Fit => Boolean(value && value in PRODUCTS);
const validSize = (value: string | undefined): value is Size => Boolean(value && value in SIZES);

function shippingAddress(session: Stripe.Checkout.Session) {
  const collected = session.collected_information?.shipping_details;
  const legacy = (session as Stripe.Checkout.Session & {
    shipping_details?: { name?: string | null; address?: Stripe.Address | null } | null;
  }).shipping_details;
  const details = collected || legacy;
  const address = details?.address || session.customer_details?.address;
  const name = details?.name || session.customer_details?.name;

  if (!address || !name || !address.line1 || !address.city || !address.postal_code || !address.country) {
    throw new Error("The paid session is missing a complete shipping address");
  }

  return {
    name,
    address1: address.line1,
    address2: address.line2 || "",
    city: address.city,
    state: address.state || "",
    zip: address.postal_code,
    country: address.country,
  };
}

export async function fulfillCheckoutSession(sessionId: string) {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] });
  if (session.payment_status !== "paid") return { status: "unpaid" as const };

  const fit = session.metadata?.fit;
  const size = session.metadata?.size;
  const timestamp = Number(session.metadata?.timestamp);
  if (!validFit(fit) || !validSize(size) || !Number.isSafeInteger(timestamp)) {
    throw new Error("The paid session has invalid product metadata");
  }

  const paymentIntent = session.payment_intent;
  if (!paymentIntent || typeof paymentIntent === "string") throw new Error("The paid session is missing its PaymentIntent");
  const priorState = paymentIntent.metadata.fulfillment_state;
  if (priorState === "fulfilled" || priorState === "quoted") {
    return { status: priorState, reference: paymentIntent.metadata.sp_reference };
  }
  if (priorState === "processing") {
    const startedAt = Number(paymentIntent.metadata.fulfillment_started_at || 0);
    if (Date.now() - startedAt < 120_000) return { status: "processing" as const };
  }

  await stripe.paymentIntents.update(paymentIntent.id, {
    metadata: { fulfillment_state: "processing", fulfillment_started_at: String(Date.now()) },
  });

  try {
    const result = await sendToScalablePress({ timestamp, fit, size, address: shippingAddress(session) });
    await stripe.paymentIntents.update(paymentIntent.id, {
      metadata: {
        fulfillment_state: result.status,
        sp_reference: result.reference,
        sp_design_id: result.designId,
      },
    });
    return result;
  } catch (error) {
    await stripe.paymentIntents.update(paymentIntent.id, {
      metadata: {
        fulfillment_state: "failed",
        fulfillment_error: error instanceof Error ? error.message.slice(0, 450) : "Unknown fulfillment error",
      },
    });
    throw error;
  }
}

export async function getOrderStatus(sessionId: string) {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] });
  const intent = session.payment_intent;
  const metadata = intent && typeof intent !== "string" ? intent.metadata : {};
  return {
    paymentStatus: session.payment_status,
    fulfillmentStatus: metadata.fulfillment_state || "pending",
    reference: metadata.sp_reference || null,
    email: session.customer_details?.email || session.customer_email || null,
    timestamp: session.metadata?.timestamp || null,
    fit: session.metadata?.fit || null,
    size: session.metadata?.size || null,
  };
}
