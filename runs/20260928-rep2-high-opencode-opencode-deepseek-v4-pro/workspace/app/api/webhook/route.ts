import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createProdigiOrder } from "@/lib/prodigi";
import { buildDesignUrl, type DesignParams } from "@/lib/design";
import { PRODIGI_SKU } from "@/lib/config";

export const runtime = "nodejs";

// Resolve the public base URL of this deployment.
function getBaseUrl(req: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const payload = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(payload, signature ?? "", secret);
  } catch (err) {
    console.error("Webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Only fulfil on successful payment.
  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as any;

  // Guard against duplicate fulfilment (Stripe may retry webhooks).
  if (session.payment_status !== "paid") {
    console.warn(`Session ${session.id} not paid (${session.payment_status}); skipping`);
    return NextResponse.json({ received: true });
  }

  const metadata = session.metadata ?? {};
  const design: DesignParams = {
    date: metadata.date,
    lat: parseFloat(metadata.lat),
    lng: parseFloat(metadata.lng),
    title: metadata.title,
    locationName: metadata.locationName,
    color: metadata.color,
    size: metadata.size,
  };

  if (!design.date || !design.title || !design.color || !design.size) {
    console.error("Missing design metadata on session", session.id);
    return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
  }

  const shipping = session.shipping_details ?? session.shipping ?? {};
  const address = shipping.address ?? {};
  const recipientName = shipping.name || session.customer_details?.name || "Customer";

  const baseUrl = getBaseUrl(req);
  const assetUrl = buildDesignUrl(baseUrl, design);

  // Use the payment intent id as a stable idempotency key so retries never
  // create duplicate Prodigi orders.
  const idempotencyKey = `stripe-${session.payment_intent ?? session.id}`;
  const merchantReference = `stripe-${session.id}`;

  try {
    const order = await createProdigiOrder({
      merchantReference,
      idempotencyKey,
      shippingMethod: "Standard",
      recipient: {
        name: recipientName,
        email: session.customer_details?.email ?? null,
        address: {
          line1: address.line1 || "—",
          line2: address.line2 ?? null,
          postalOrZipCode: address.postal_code || "00000",
          countryCode: address.country || "US",
          townOrCity: address.city || "—",
          stateOrCounty: address.state ?? null,
        },
      },
      sku: PRODIGI_SKU,
      color: design.color,
      size: design.size,
      assetUrl,
      metadata: {
        stripeSessionId: session.id,
        title: design.title,
        locationName: design.locationName,
      },
    });

    console.log(
      `Prodigi order ${order.id} created for Stripe session ${session.id} (${design.title})`
    );

    return NextResponse.json({ received: true, prodigiOrderId: order.id });
  } catch (err) {
    // Log and return 500 so Stripe retries the webhook.
    console.error("Prodigi order creation failed", err);
    return NextResponse.json({ error: "Fulfilment failed" }, { status: 500 });
  }
}
