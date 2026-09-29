import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createProdigiOrder } from "@/lib/prodigi";
import { DesignParams, designToQuery, BASE_PRICE_USD } from "@/lib/config";

export const runtime = "nodejs";

function origin(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const proto = req.headers.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}

function printImageUrl(base: string, design: DesignParams): string {
  const q = designToQuery(design);
  q.format = "png";
  const params = new URLSearchParams(q);
  return `${base}/api/star-map?${params.toString()}`;
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook secret not configured." }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const rawBody = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (e: any) {
    console.error("Webhook signature verification failed", e.message);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  // Only fulfil after payment has actually succeeded. For card payments the
  // session completes with payment_status "paid"; for async methods (e.g. some
  // bank debits) it completes "unpaid" and a separate event confirms payment.
  const isPaid =
    event.type === "checkout.session.async_payment_succeeded" ||
    (event.type === "checkout.session.completed" &&
      (event.data.object as Stripe.Checkout.Session).payment_status === "paid");

  if (!isPaid) {
    return NextResponse.json({ received: true, awaiting_payment: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  // Guard against double-processing: Prodigi's idempotency key (the session id)
  // also protects us, but skip early if we already have a Prodigi reference.
  if (session.metadata?.prodigi_order_id) {
    return NextResponse.json({ received: true, already_fulfilled: true });
  }

  let design: DesignParams;
  try {
    design = JSON.parse(session.metadata?.design || "{}");
  } catch {
    console.error("Could not parse design metadata", session.id);
    return NextResponse.json({ error: "Missing design metadata." }, { status: 400 });
  }

  const shipping = session.shipping_details;
  if (!shipping?.address) {
    console.error("No shipping address on session", session.id);
    return NextResponse.json({ error: "No shipping address." }, { status: 400 });
  }

  const base = origin(req);
  const assetUrl = printImageUrl(base, design);

  try {
    const result = await createProdigiOrder({
      merchantReference: `stellara-${session.id}`,
      idempotencyKey: session.id,
      recipient: {
        name: shipping.name || "Customer",
        line1: shipping.address.line1 || "",
        line2: shipping.address.line2 || undefined,
        city: shipping.address.city || "",
        state: shipping.address.state || undefined,
        postalCode: shipping.address.postal_code || "",
        countryCode: shipping.address.country || "US",
        email: session.customer_details?.email || undefined,
      },
      sku: "GLOBAL-TEE-GIL-64000",
      copies: design.quantity || 1,
      color: design.color,
      size: design.size,
      assetUrl,
      recipientCostUsd: BASE_PRICE_USD * (design.quantity || 1),
    });

    const prodigiOrderId = result?.order?.id || null;
    console.log(
      `Fulfilled session ${session.id} -> Prodigi order ${prodigiOrderId}`
    );

    // Record the Prodigi order id back on the session for traceability.
    if (prodigiOrderId) {
      try {
        await stripe.checkout.sessions.update(session.id, {
          metadata: { ...session.metadata, prodigi_order_id: prodigiOrderId },
        });
      } catch (e) {
        console.error("Could not update session metadata", e);
      }
    }

    return NextResponse.json({ received: true, prodigi_order_id: prodigiOrderId });
  } catch (e: any) {
    console.error("Prodigi fulfilment failed", e);
    // Return 500 so Stripe retries the event.
    return NextResponse.json(
      { error: "Fulfilment failed, will retry." },
      { status: 500 }
    );
  }
}
