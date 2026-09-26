import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripeClient } from "@/server/stripe";
import { decodeSpec } from "@/lib/spec";
import { printUrl } from "@/server/signing";
import { createProdigiOrder, type ProdigiRecipient } from "@/server/prodigi";
import { priceCents } from "@/lib/products";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * The one and only path to production: a Stripe `checkout.session.completed`
 * event with a verified signature and `payment_status === "paid"`. Everything
 * else — previews, checkouts, success pages — is read-only.
 *
 * Idempotency: the Prodigi order's idempotency key and merchant reference are
 * both the Stripe session id, and Prodigi returns the existing order for a
 * repeated key, so webhook retries can never print two shirts.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) {
    return NextResponse.json({ error: "missing signature or secret" }, { status: 400 });
  }

  const stripe = stripeClient();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig, secret);
  } catch (e) {
    console.error("webhook signature verification failed", (e as Error).message);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.expired") {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  interface ShipAddress {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country?: string | null;
  }
  interface ShipDetails {
    name?: string | null;
    address?: ShipAddress | null;
  }
  const session = event.data.object as unknown as {
    id: string;
    payment_status?: string | null;
    amount_total?: number | null;
    metadata?: Record<string, string> | null;
    payment_intent?: string | { id: string } | null;
    customer_details?: { email?: string | null } | null;
    shipping_details?: ShipDetails | null;
  };

  if (session.payment_status !== "paid") {
    // Deferred/asynchronous payment methods are not enabled; a completed
    // session that is not paid must never reach a printer.
    return NextResponse.json({ received: true, ignored: "not paid" });
  }

  const encoded = session.metadata?.spec;
  if (!encoded) {
    console.error("paid session without spec metadata", session.id);
    return NextResponse.json({ received: true, error: "no spec" }, { status: 200 });
  }
  const decoded = decodeSpec(encoded);
  if (!decoded.ok) {
    console.error("invalid spec in metadata", decoded.error, session.id);
    return NextResponse.json({ received: true, error: "bad spec" }, { status: 200 });
  }
  const spec = decoded.spec;

  let ship: ShipDetails | null = session.shipping_details ?? null;
  // Some payment paths (e.g. the internal payment-page confirm) attach the
  // shipping to the PaymentIntent rather than the session — fall back so
  // fulfillment is never blocked on a missing address.
  if (!ship?.address) {
    try {
      let piId = typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;
      if (!piId) {
        // Minimal events can omit the payment intent — fetch the full session.
        const full = await stripe.checkout.sessions.retrieve(session.id);
        const fp = (full as unknown as { payment_intent?: string | { id: string } | null }).payment_intent;
        piId = typeof fp === "string" ? fp : fp?.id;
      }
      if (piId) {
        const pi = await stripe.paymentIntents.retrieve(piId);
        const pis = (pi as unknown as { shipping?: ShipDetails | null }).shipping;
        if (pis?.address) ship = { name: pis.name, address: pis.address };
      }
    } catch { /* keep session shipping */ }
  }
  const addr = ship?.address;
  if (!addr || !addr.city || !addr.country || !addr.postal_code || !ship?.name) {
    console.error("paid session without usable shipping details", session.id);
    // Retry — Stripe will re-send; but if it is a permanent data problem the
    // customer must be contacted manually (logged above).
    return NextResponse.json({ error: "missing shipping details" }, { status: 500 });
  }

  const recipient: ProdigiRecipient = {
    name: ship.name,
    email: session.customer_details?.email ?? undefined,
    address: {
      line1: addr.line1 ?? "",
      line2: addr.line2 ?? undefined,
      townOrCity: addr.city,
      stateOrCounty: addr.state ?? undefined,
      postalOrZipCode: addr.postal_code,
      countryCode: addr.country,
    },
  };

  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  const artworkUrl = printUrl(origin, encoded);
  const amount = session.amount_total ?? priceCents(spec.size);

  const result = await createProdigiOrder({
    merchantReference: session.id,
    idempotencyKey: session.id,
    recipient,
    color: spec.color,
    size: spec.size,
    artworkUrl,
    recipientCost: { amount: (amount / 100).toFixed(2), currency: "USD" },
  });

  if (!result.ok) {
    console.error("prodigi order failed", JSON.stringify(result.error), "session", session.id);
    // 500 → Stripe retries with backoff; idempotency key prevents doubles.
    return NextResponse.json({ error: "fulfillment failed, will retry" }, { status: 500 });
  }

  console.log("fulfilled", {
    session: session.id,
    prodigi: result.orderId,
    duplicate: result.duplicate,
  });
  return NextResponse.json({
    received: true,
    fulfilled: true,
    prodigiOrderId: result.orderId,
    duplicate: result.duplicate,
  });
}
