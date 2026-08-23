import type Stripe from "stripe";
import { z } from "zod";
import { createDesign, createQuote, placeOrder } from "./scalable-press";
import { stripeClient } from "./stripe";

const metadataSchema = z.object({
  shirt_style: z.enum(["fitted", "unisex"]),
  shirt_size: z.enum(["S", "M", "L", "XL"]),
  captured_at: z.string().regex(/^\d{13}$/),
});

export async function fulfillCheckout(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") throw new Error(`Checkout ${session.id} is not paid`);
  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  if (!paymentIntentId) throw new Error("Checkout has no PaymentIntent");

  const stripe = stripeClient();
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (["quoted", "ordered"].includes(paymentIntent.metadata.fulfillment_status)) {
    return { status: paymentIntent.metadata.fulfillment_status, reference: paymentIntent.metadata.sp_reference };
  }

  const metadata = metadataSchema.parse(session.metadata);
  const shippingDetails = session.collected_information?.shipping_details;
  if (!shippingDetails?.address) throw new Error("Checkout has no shipping address");

  await stripe.paymentIntents.update(paymentIntentId, {
    metadata: { fulfillment_status: "processing", fulfillment_attempted_at: new Date().toISOString() },
  });

  try {
    const designId = await createDesign(metadata.captured_at);
    const quote = await createQuote({
      designId,
      style: metadata.shirt_style,
      size: metadata.shirt_size,
      shipping: { ...shippingDetails.address, name: shippingDetails.name },
    });
    const mode = process.env.FULFILLMENT_MODE === "live" ? "live" : "quote";
    const reference = mode === "live" ? await placeOrder(quote.orderToken!) : quote.orderToken!;
    const status = mode === "live" ? "ordered" : "quoted";
    await stripe.paymentIntents.update(paymentIntentId, {
      metadata: {
        fulfillment_status: status,
        fulfillment_mode: mode,
        sp_design_id: designId,
        sp_reference: reference,
      },
    });
    return { status, reference };
  } catch (error) {
    await stripe.paymentIntents.update(paymentIntentId, {
      metadata: { fulfillment_status: "failed", fulfillment_error_at: new Date().toISOString() },
    });
    throw error;
  }
}
