import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { intentParams } from "@/lib/fulfill";
import { SHIP_COUNTRIES, isSizeFor, isStyle } from "@/lib/products";

export const runtime = "nodejs";

/** How far the client's "bought at" timestamp may drift from server time. */
const MAX_SKEW_MS = 10 * 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface CheckoutBody {
  style?: unknown;
  size?: unknown;
  timestamp?: unknown;
  email?: unknown;
  shipping?: {
    name?: unknown;
    phone?: unknown;
    address?: Record<string, unknown>;
  };
}

function str(v: unknown, max = 200): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t ? t.slice(0, max) : undefined;
}

/**
 * POST /api/checkout
 * Body: { style, size, timestamp, email, shipping: { name, phone?, address: { line1, line2?, city, state?, postal_code, country } } }
 * Creates the PaymentIntent for exactly one shirt. Price is set server-side.
 */
export async function POST(req: NextRequest) {
  let body: CheckoutBody;
  try {
    body = (await req.json()) as CheckoutBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const style = body.style;
  if (!isStyle(style)) return NextResponse.json({ error: "Unknown style" }, { status: 400 });
  const size = body.size;
  if (!isSizeFor(style, size)) return NextResponse.json({ error: "Unknown size for that style" }, { status: 400 });

  const timestamp = Number(body.timestamp);
  if (!Number.isInteger(timestamp) || Math.abs(Date.now() - timestamp) > MAX_SKEW_MS) {
    return NextResponse.json({ error: "Timestamp must be the current time (±10 minutes)" }, { status: 400 });
  }

  const email = str(body.email);
  if (!email || !EMAIL_RE.test(email)) return NextResponse.json({ error: "A valid email is required" }, { status: 400 });

  const addr = body.shipping?.address ?? {};
  const shipping: Stripe.PaymentIntentCreateParams.Shipping = {
    name: str(body.shipping?.name) ?? "",
    phone: str(body.shipping?.phone, 40),
    address: {
      line1: str(addr.line1) ?? "",
      line2: str(addr.line2),
      city: str(addr.city),
      state: str(addr.state),
      postal_code: str(addr.postal_code, 20),
      country: str(addr.country, 2)?.toUpperCase(),
    },
  };
  if (!shipping.name) return NextResponse.json({ error: "Recipient name is required" }, { status: 400 });
  if (!shipping.address.line1 || !shipping.address.city || !shipping.address.postal_code || !shipping.address.country) {
    return NextResponse.json({ error: "A complete shipping address is required" }, { status: 400 });
  }
  if (!SHIP_COUNTRIES.includes(shipping.address.country)) {
    return NextResponse.json({ error: `Sorry, we only ship to ${SHIP_COUNTRIES.join(", ")} right now` }, { status: 400 });
  }

  try {
    // Shipping is attached by Stripe.js at confirm time (Address Element / Express Checkout);
    // Stripe rejects a publishable-key change to shipping set here with the secret key.
    // We still validate it above and keep a copy in metadata as a fallback for fulfillment.
    const pi = await stripe().paymentIntents.create(intentParams({ style, size, timestamp, email, shipping }));
    return NextResponse.json({ id: pi.id, clientSecret: pi.client_secret, amount: pi.amount, currency: pi.currency });
  } catch (err) {
    console.error("[checkout] failed to create PaymentIntent", err);
    const message = err instanceof Error ? err.message : "Payment setup failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
