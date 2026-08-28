import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createProdigiOrder } from "@/lib/prodigi";
import { isShirtSize, isShirtStyle } from "@/lib/shirt";

export const runtime = "nodejs";

// Fulfillment side-effects live here, triggered by Stripe once payment is
// confirmed. This is the hand-off point from "Stripe" to "Prodigi": we take
// the frozen timestamp + shipping address collected at checkout and place a
// print order in Prodigi's sandbox.
export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    if (!webhookSecret || !signature) {
      throw new Error("Missing STRIPE_WEBHOOK_SECRET or stripe-signature header.");
    }
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    await fulfillOrder(stripe, session);
  }

  return NextResponse.json({ received: true });
}

async function fulfillOrder(stripe: Stripe, session: Stripe.Checkout.Session) {
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;

  try {
    if (session.payment_status !== "paid") {
      console.warn(`Session ${session.id} completed but not paid yet; skipping fulfillment.`);
      return;
    }

    // Stripe delivers webhooks at-least-once, so the same completed session
    // can arrive here more than once. Guard against placing a duplicate
    // Prodigi order by checking whether we've already fulfilled this
    // PaymentIntent before doing anything else.
    if (paymentIntentId) {
      const existing = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (existing.metadata?.prodigiOrderId) {
        console.log(
          `Session ${session.id} already fulfilled as Prodigi order ${existing.metadata.prodigiOrderId}; skipping duplicate delivery.`,
        );
        return;
      }
    }

    const { style, size, artworkUrl } = session.metadata ?? {};
    if (!isShirtStyle(style) || !isShirtSize(size) || !artworkUrl) {
      throw new Error(`Session ${session.id} missing/invalid product metadata.`);
    }

    const shipping = session.collected_information?.shipping_details;
    const address = shipping?.address;
    const email = session.customer_details?.email;
    if (!shipping || !address || !address.line1 || !address.city || !address.postal_code || !address.country) {
      throw new Error(`Session ${session.id} missing shipping address.`);
    }
    if (!email) {
      throw new Error(`Session ${session.id} missing customer email.`);
    }

    const order = await createProdigiOrder({
      merchantReference: session.id,
      recipientName: shipping.name || session.customer_details?.name || "Customer",
      recipientEmail: email,
      address: {
        line1: address.line1,
        line2: address.line2,
        townOrCity: address.city,
        stateOrCounty: address.state,
        postalOrZipCode: address.postal_code,
        countryCode: address.country,
      },
      style,
      size,
      artworkUrl,
    });

    if (paymentIntentId) {
      await stripe.paymentIntents.update(paymentIntentId, {
        metadata: {
          prodigiOrderId: order.id,
          prodigiStatus: order.status?.stage ?? "InProgress",
        },
      });
    }
    console.log(`Prodigi order ${order.id} created for session ${session.id}`);
  } catch (err) {
    console.error(`Fulfillment failed for session ${session.id}`, err);
    if (paymentIntentId) {
      await stripe.paymentIntents
        .update(paymentIntentId, {
          metadata: {
            prodigiStatus: "failed",
            prodigiError: err instanceof Error ? err.message.slice(0, 480) : "Unknown error",
          },
        })
        .catch((e) => console.error("Failed to record fulfillment error on PaymentIntent", e));
    }
  }
}
