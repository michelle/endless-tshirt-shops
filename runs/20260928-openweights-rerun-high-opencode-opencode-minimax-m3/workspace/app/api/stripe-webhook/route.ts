// Stripe webhook. The single source of truth for "did this person pay".
// On `checkout.session.completed`, we pull the design out of metadata, build
// the asset URL that Prodigi will fetch, and POST the order to Prodigi.

import { NextResponse } from "next/server";

import { designFromStripeMetadata } from "@/lib/design";
import { stripe } from "@/lib/stripe";
import { createProdigiOrder } from "@/lib/prodigi";
import { publicBaseUrl } from "@/lib/env";
import { saveOrderRecord, getOrderRecord } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildAssetUrl(baseUrl: string, params: URLSearchParams): string {
  return `${baseUrl}/api/asset?${params.toString()}`;
}

function pickShippingMethod(country: string): "Standard" | "Express" {
  // Prodigi doesn't ship "Overnight" everywhere. Standard is the safest,
  // most-shipped option; Express for customers who pay more is an opt-in.
  return country.toUpperCase() === "US" ? "Express" : "Standard";
}

function recordKey(session: {
  id: string;
  payment_intent?: string | null;
}): string {
  // The browser-visible order id is the Stripe Checkout session id; the
  // Prodigi order id is set after we POST.
  return session.id;
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { error: "webhook secret not configured" },
      { status: 500 },
    );
  }

  const body = await req.text();
  let event;
  try {
    event = stripe().webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "verification failed";
    return NextResponse.json(
      { error: `webhook signature verification failed: ${message}` },
      { status: 400 },
    );
  }

  if (event.type !== "checkout.session.completed") {
    // Acknowledge other event types but do nothing.
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as {
    id: string;
    payment_intent?: string | null;
    amount_total?: number | null;
    currency?: string | null;
    customer_details?: { email?: string | null; name?: string | null };
    shipping_details?: {
      name?: string | null;
      address?: {
        line1?: string | null;
        line2?: string | null;
        postal_code?: string | null;
        city?: string | null;
        state?: string | null;
        country?: string | null;
      } | null;
    } | null;
    metadata?: Record<string, string> | null;
  };

  const design = designFromStripeMetadata(session.metadata);
  if (!design) {
    console.error("checkout.session.completed without our design metadata", session.id);
    return NextResponse.json(
      { error: "missing design metadata" },
      { status: 400 },
    );
  }

  const recipientName =
    session.shipping_details?.name ||
    session.customer_details?.name ||
    "Customer";
  const addr = session.shipping_details?.address;
  if (!addr?.line1 || !addr.city || !addr.postal_code || !addr.country) {
    console.error("checkout.session.completed missing shipping address", session.id);
    // Mark the order as failed in our store so the order status page is honest.
    saveOrderRecord({
      key: recordKey(session),
      stripeSessionId: session.id,
      stripePaymentIntentId: session.payment_intent ?? null,
      amountTotal: session.amount_total ?? null,
      currency: session.currency ?? null,
      design,
      prodigiOrderId: null,
      prodigiOutcome: "missing-shipping-address",
      prodigiIssues: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return NextResponse.json(
      { error: "missing shipping address" },
      { status: 400 },
    );
  }

  const baseUrl = publicBaseUrl(req);
  const assetParams = new URLSearchParams({
    date: design.date,
    lat: design.lat.toFixed(2),
    lon: design.lon.toFixed(2),
    title: design.title,
  });
  if (design.place) assetParams.set("place", design.place);
  const assetUrl = buildAssetUrl(baseUrl, assetParams);

  const recipient = {
    name: recipientName,
    email: session.customer_details?.email ?? null,
    address: {
      line1: addr.line1,
      line2: addr.line2 ?? null,
      postalOrZipCode: addr.postal_code,
      countryCode: addr.country,
      townOrCity: addr.city,
      stateOrCounty: addr.state ?? null,
    },
  };

  try {
    const shipping = pickShippingMethod(addr.country);
    const result = await createProdigiOrder({
      merchantReference: `stripe-${session.id}`,
      shippingMethod: shipping,
      recipient,
      assetUrl,
      design,
    });

    saveOrderRecord({
      key: recordKey(session),
      stripeSessionId: session.id,
      stripePaymentIntentId: session.payment_intent ?? null,
      amountTotal: session.amount_total ?? null,
      currency: session.currency ?? null,
      design,
      prodigiOrderId: result.order?.id ?? null,
      prodigiOutcome: result.outcome ?? "unknown",
      prodigiIssues: (result.issues ?? []).map((i) => ({
        code: (i as { errorCode?: string }).errorCode ?? null,
        description: (i as { description?: string }).description ?? null,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      received: true,
      prodigiOrderId: result.order?.id ?? null,
      outcome: result.outcome,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "prodigi failed";
    console.error("Prodigi submission failed", session.id, message);
    saveOrderRecord({
      key: recordKey(session),
      stripeSessionId: session.id,
      stripePaymentIntentId: session.payment_intent ?? null,
      amountTotal: session.amount_total ?? null,
      currency: session.currency ?? null,
      design,
      prodigiOrderId: null,
      prodigiOutcome: "prodigi-error",
      prodigiIssues: [{ code: null, description: message }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    // Return 200 so Stripe doesn't retry; the failure is recorded so we
    // can re-submit out-of-band if necessary.
    return NextResponse.json({ received: true, error: message }, { status: 200 });
  }
}

// Expose a tiny GET so the operator can verify the endpoint is wired up
// without having to fake a Stripe signature.
export async function GET() {
  return NextResponse.json({
    ok: true,
    hasSecret: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    knownRecord: getOrderRecord("noop"),
  });
}
