// app/api/webhook/route.ts
// Receives Stripe events. On `checkout.session.completed` we mark the
// order paid + dispatch it to Prodigi via /lib/fulfill.

import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { fulfillOrder } from "@/lib/fulfill";
import {
  getAppBaseUrl,
  getPaymentClient,
  getProdigi,
  getStorage,
} from "@/lib/services";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();

  // Verify Stripe signature if we have a configured secret.
  const secret =
    process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_CLI_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json(
      { error: "missing signature or webhook secret" },
      { status: 400 }
    );
  }
  if (!verifyStripeSignature(raw, sig, secret)) {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  let event: { type: string; data: { object: StripeObjectLike } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    // We only act on completed sessions. Acknowledge anyway so Stripe stops retrying.
    return NextResponse.json({ received: true, ignored: event.type });
  }

  return processCompletedSession(event.data.object);
}

/* --------------------------------------------------------------------- */

interface StripeObjectLike {
  id: string;
  payment_status?: string;
  payment_intent?: string | { id: string };
  amount_total?: number;
  currency?: string;
  customer_details?: {
    name?: string;
    email?: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postal_code?: string;
      country?: string;
    };
  };
  shipping_details?: {
    name?: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postal_code?: string;
      country?: string;
    };
  };
  metadata?: Record<string, string>;
}

async function processCompletedSession(s: StripeObjectLike) {
  const orderId = s.metadata?.orderId;
  if (!orderId) {
    return NextResponse.json(
      { error: "missing orderId in metadata" },
      { status: 400 }
    );
  }
  const storage = getStorage();
  const order = await storage.readOrder(orderId);
  if (!order) {
    return NextResponse.json({ error: "order not found" }, { status: 404 });
  }
  if (order.status === "submitted") {
    return NextResponse.json({ received: true, alreadySubmitted: true });
  }

  // Capture Stripe's shipping address if our form left it blank.
  const shipAddr = s.shipping_details?.address ?? s.customer_details?.address;
  const stripeName = s.shipping_details?.name ?? s.customer_details?.name;
  if (!order.recipient?.line1 && shipAddr) {
    order.recipient = {
      ...order.recipient,
      name: order.recipient?.name || stripeName || "Customer",
      email: order.recipient?.email || s.customer_details?.email,
      line1: shipAddr.line1,
      line2: shipAddr.line2,
      city: shipAddr.city,
      state: shipAddr.state,
      postal: shipAddr.postal_code,
      country: shipAddr.country,
    };
  }

  order.status = "paid";
  order.updatedAt = new Date().toISOString();
  order.stripe = {
    sessionId: s.id,
    paymentIntent:
      typeof s.payment_intent === "string"
        ? s.payment_intent
        : s.payment_intent?.id,
    amountTotalCents: s.amount_total,
  };
  await storage.writeOrder(order);

  try {
    const result = await fulfillOrder(order, {
      prodigi: getProdigi({ PRODIGI_API_KEY: process.env.PRODIGI_API_KEY }),
      storage,
      appBaseUrl: getAppBaseUrl(process.env),
    });
    return NextResponse.json({ received: true, result });
  } catch (e) {
    return NextResponse.json(
      { error: "fulfillment failed", detail: (e as Error).message },
      { status: 500 }
    );
  }
}

/* ---------- Stripe signature verification ---------- */

function verifyStripeSignature(
  payload: string,
  header: string,
  secret: string
): boolean {
  // Stripe signature format: t=...,v1=...,v0=...
  // Recompute HMAC-SHA256(secret, t.payload) and compare against v1.
  const parts = header.split(",").map((p) => p.trim()).reduce<Record<string, string>>(
    (acc, p) => {
      const idx = p.indexOf("=");
      if (idx < 0) return acc;
      acc[p.slice(0, idx)] = p.slice(idx + 1);
      return acc;
    },
    {}
  );
  const t = parts["t"];
  const v1 = parts["v1"];
  if (!t || !v1) return false;
  const signedPayload = `${t}.${payload}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");
  // Constant-time compare to thwart timing side-channels.
  if (expected.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ v1.charCodeAt(i);
  }
  return diff === 0;
}
