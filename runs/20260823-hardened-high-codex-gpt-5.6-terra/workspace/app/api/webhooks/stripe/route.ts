import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createFulfillment } from "../../../../lib/fulfillment";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) return new NextResponse("Webhook configuration missing", { status: 500 });
  let event: Stripe.Event;
  try {
    event = new Stripe(process.env.STRIPE_SECRET_KEY).webhooks.constructEvent(await request.text(), request.headers.get("stripe-signature") || "", process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    console.warn("Invalid Stripe signature", error);
    return new NextResponse("Invalid signature", { status: 400 });
  }
  if (event.type !== "checkout.session.completed") return NextResponse.json({ received: true });
  try {
    // Stripe signs the complete Checkout Session payload, including the shipping
    // details we need. Using it directly avoids an unnecessary second API call
    // and is resilient to delayed webhook delivery.
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status !== "paid") return NextResponse.json({ received: true });
    const details = session.customer_details;
    await createFulfillment({
      sessionId: session.id,
      timestamp: session.metadata?.timestamp || String(Date.now()),
      style: (session.metadata?.style || "fitted") as "fitted" | "unisex",
      size: session.metadata?.size || "M",
      email: details?.email || session.customer_email || "",
      address: details?.address || {},
    });
    return NextResponse.json({ received: true });
  } catch (error) {
    // Returning 500 makes Stripe retry; fulfillment is only attempted after a successful payment.
    console.error("fulfillment", error);
    return new NextResponse("Fulfillment failed; retry requested", { status: 500 });
  }
}
