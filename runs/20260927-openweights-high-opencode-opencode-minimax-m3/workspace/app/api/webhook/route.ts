import { NextResponse } from "next/server";
import { stripe, stripeReady } from "@/lib/stripe";
import type Stripe from "stripe";
import { fulfillPaidOrder } from "@/lib/fulfill";
import { verify } from "@/lib/tokens";
import type { Customization } from "@/lib/render";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ProcessedEvent {
  id: string;
  type: string;
  outcome: string;
  orderId?: string;
  error?: string;
}

const processedByEventId = new Map<string, ProcessedEvent>();

export async function POST(req: Request) {
  if (!stripeReady()) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
  }
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    return NextResponse.json({ error: `Signature invalid: ${(err as Error).message}` }, { status: 400 });
  }

  const existing = processedByEventId.get(event.id);
  if (existing) {
    return NextResponse.json({ ok: true, dedup: true, event: existing });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status !== "paid") {
      const note: ProcessedEvent = { id: event.id, type: event.type, outcome: "skipped-not-paid" };
      processedByEventId.set(event.id, note);
      return NextResponse.json({ ok: true, note, dedup: false });
    }

    const customization = customizationFromSession(session);
    const recipient = recipientFromSession(session);

    const callbackUrl =
      process.env.NEXT_PUBLIC_BASE_URL
        ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/order-status`
        : process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}/api/order-status`
          : undefined;

    try {
      const result = await fulfillPaidOrder({
        customization,
        recipient,
        stripeSessionId: session.id,
        callbackUrl,
      });
      const note: ProcessedEvent = {
        id: event.id,
        type: event.type,
        outcome: result.outcome,
        orderId: result.order?.id,
      };
      processedByEventId.set(event.id, note);
      return NextResponse.json({ ok: true, event: note, dedup: false });
    } catch (err) {
      const note: ProcessedEvent = {
        id: event.id,
        type: event.type,
        outcome: "prodigi-failed",
        error: (err as Error).message,
      };
      processedByEventId.set(event.id, note);
      // Returning 500 makes Stripe retry the delivery; this is what we want.
      return NextResponse.json({ error: note.error, event: note }, { status: 500 });
    }
  }

  // Other events we don't care about — accept, acknowledge.
  const note: ProcessedEvent = { id: event.id, type: event.type, outcome: "ignored" };
  processedByEventId.set(event.id, note);
  return NextResponse.json({ ok: true, event: note, dedup: false });
}

function customizationFromSession(session: Stripe.Checkout.Session): Customization {
  const md = (session.metadata || {}) as Record<string, string>;
  // Prefer payment_intent.metadata if Stripe hydrated it onto the session PI.
  const piMeta = (session.payment_intent as Stripe.PaymentIntent | null)?.metadata as
    | Record<string, string>
    | undefined;
  const meta = { ...md, ...(piMeta || {}) };
  const token = meta.design_token;
  const verified = token ? verify<Customization>(token) : null;
  if (verified) return verified;
  // Fall back to flat metadata fields.
  return {
    phrase: meta.phrase || "Untitled",
    phrase2: meta.phrase2 || "",
    date: meta.isoDate || new Date().toISOString(),
    place: meta.place || "Somewhere",
    lat: Number(meta.lat) || 0,
    lon: Number(meta.lon) || 0,
    color: (meta.color as Customization["color"]) || "navy",
    size: (meta.size as Customization["size"]) || "m",
  };
}

function recipientFromSession(session: Stripe.Checkout.Session) {
  const shipping = session.shipping_details;
  const address = shipping?.address;
  return {
    name: shipping?.name || session.customer_details?.name || "Customer",
    email: session.customer_details?.email || session.customer_email || undefined,
    phone: session.customer_details?.phone || undefined,
    address: {
      line1: address?.line1 || "1 Main St",
      line2: address?.line2 || undefined,
      city: address?.city || "New York",
      state: address?.state || undefined,
      postalCode: address?.postal_code || "10001",
      country: (address?.country || "US").toUpperCase(),
    },
  };
}
