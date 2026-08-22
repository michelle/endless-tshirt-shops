import Stripe from "stripe";
import { submitFulfillment } from "./fulfillment";

export async function fulfillCheckoutSession(sessionId) {
  if (!process.env.STRIPE_SECRET_KEY) {
    const error = new Error("Checkout is not configured.");
    error.status = 503;
    throw error;
  }
  if (!sessionId?.startsWith("cs_")) {
    const error = new Error("Invalid checkout session.");
    error.status = 400;
    throw error;
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid" || session.metadata?.product !== "datetime.store") {
    const error = new Error("Payment has not completed.");
    error.status = 409;
    throw error;
  }
  if (session.metadata?.fulfillment_order_id) {
    return { orderId: session.metadata.fulfillment_order_id, mode: session.metadata.fulfillment_mode || "previous" };
  }
  if (!session.shipping_details?.address) {
    const error = new Error("A shipping address is required.");
    error.status = 422;
    throw error;
  }

  const fulfillment = await submitFulfillment({
    timestamp: session.metadata.timestamp,
    style: session.metadata.style,
    size: session.metadata.size,
    shippingAddress: { name: session.shipping_details.name, ...session.shipping_details.address },
    customerEmail: session.customer_details?.email,
    orderReference: session.id,
  });
  // Store the print-partner reference on Stripe's durable order record. This
  // makes customer return-page retries and webhook retries idempotent after a
  // successful hand-off.
  await stripe.checkout.sessions.update(session.id, {
    metadata: { ...session.metadata, fulfillment_order_id: fulfillment.orderId, fulfillment_mode: fulfillment.mode },
  });
  return { orderId: fulfillment.orderId, mode: fulfillment.mode };
}
