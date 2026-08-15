import { NextResponse } from "next/server";
import { validSelection } from "../../../lib/catalog";
import { createDesign, quoteOrder, submitOrder } from "../../../lib/scalable-press";
import { stripeClient } from "../../../lib/stripe";

export async function POST(request) {
  try {
    const { sessionId } = await request.json();
    if (!sessionId || !sessionId.startsWith("cs_")) return NextResponse.json({ error: "Invalid order" }, { status: 400 });
    const stripe = stripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] });
    if (session.payment_status !== "paid") return NextResponse.json({ status: "awaiting_payment" }, { status: 402 });
    const { style, size, timestamp } = session.metadata || {};
    if (!validSelection(style, size)) throw new Error("Invalid order metadata");
    const paymentIntent = session.payment_intent;
    if (paymentIntent?.metadata?.fulfillment === "quoted" || paymentIntent?.metadata?.fulfillment === "submitted") {
      return NextResponse.json({ status: paymentIntent.metadata.fulfillment, orderId: paymentIntent.metadata.sp_order_id || null, dryRun: paymentIntent.metadata.fulfillment === "quoted", timestamp });
    }
    const details = session.collected_information?.shipping_details || session.shipping_details;
    if (!details?.address) throw new Error("Shipping address is missing");
    const address = {
      name: details.name,
      address1: details.address.line1,
      address2: details.address.line2 || "",
      city: details.address.city,
      state: details.address.state,
      zip: details.address.postal_code,
      country: details.address.country,
    };
    const designId = await createDesign(timestamp);
    const quote = await quoteOrder({ designId, style, size, address });
    const result = await submitOrder(quote.orderToken);
    const fulfillment = result.dryRun ? "quoted" : "submitted";
    await stripe.paymentIntents.update(paymentIntent.id, { metadata: { ...paymentIntent.metadata, fulfillment, sp_design_id: designId, sp_order_token: quote.orderToken, ...(result.orderId ? { sp_order_id: result.orderId } : {}) } });
    return NextResponse.json({ status: fulfillment, orderId: result.orderId, dryRun: result.dryRun, timestamp });
  } catch (error) {
    console.error("fulfillment", error);
    return NextResponse.json({ error: error.message || "Fulfillment setup failed", issues: error.issues || [] }, { status: 502 });
  }
}
