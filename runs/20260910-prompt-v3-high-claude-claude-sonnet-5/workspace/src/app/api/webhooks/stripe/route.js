import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getPendingOrder, getOrderResult, saveOrderResult } from "@/lib/store";
import { createProdigiOrder } from "@/lib/prodigi";

export const runtime = "nodejs";

let _stripe;
function getStripe() {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return _stripe;
}

// The single place where "payment succeeded" turns into "send to print".
// Prodigi is only ever called from here - never from the client, never at
// checkout-session-creation time.
export async function POST(req) {
  const signature = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  let event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Stripe webhook signature verification failed", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object;
    try {
      await fulfill(session);
    } catch (err) {
      console.error("Order fulfillment failed for session", session.id, err);
      // Non-2xx makes Stripe retry with backoff; safe because Prodigi order
      // creation is idempotent on the checkout session id.
      return NextResponse.json({ error: "fulfillment_failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}

async function fulfill(session) {
  if (session.payment_status !== "paid") return;

  const { orderId, orderRecordUrl } = session.metadata || {};
  if (!orderId || !orderRecordUrl) {
    throw new Error(`Session ${session.id} is missing order metadata`);
  }

  const existing = await getOrderResult(orderRecordUrl);
  if (existing?.prodigiOrderId) {
    return; // already fulfilled (webhook retry / duplicate event)
  }

  const order = await getPendingOrder(orderRecordUrl);
  if (!order) throw new Error(`Pending order not found at ${orderRecordUrl}`);

  const shipping = session.shipping_details || {};
  const address = shipping.address || session.customer_details?.address;
  if (!address) throw new Error(`Session ${session.id} has no shipping address`);

  const recipient = {
    name: shipping.name || session.customer_details?.name || "Customer",
    email: session.customer_details?.email || undefined,
    phoneNumber: session.customer_details?.phone || undefined,
    address: {
      line1: address.line1,
      line2: address.line2 || undefined,
      townOrCity: address.city,
      stateOrCounty: address.state || undefined,
      postalOrZipCode: address.postal_code,
      countryCode: address.country,
    },
  };

  const items = order.items.map(({ phrase, subtitle, ...prodigiItem }) => prodigiItem);

  // callbackUrl is optional - only set it if we know our own public URL, so
  // Prodigi can push shipment status updates back to /api/webhooks/prodigi.
  const callbackUrl = process.env.SITE_URL ? `${process.env.SITE_URL}/api/webhooks/prodigi` : undefined;

  let prodigiOrder;
  try {
    prodigiOrder = await createProdigiOrder({
      idempotencyKey: session.id,
      merchantReference: orderId,
      recipient,
      items,
      callbackUrl,
    });
  } catch (err) {
    await saveOrderResult(orderId, {
      orderId,
      status: "prodigi_error",
      error: err.body || err.message,
      stripeSessionId: session.id,
      updatedAt: new Date().toISOString(),
    });
    throw err;
  }

  await saveOrderResult(orderId, {
    orderId,
    status: "submitted_to_print",
    prodigiOrderId: prodigiOrder?.order?.id,
    prodigiStatus: prodigiOrder?.order?.status,
    stripeSessionId: session.id,
    updatedAt: new Date().toISOString(),
  });
}
