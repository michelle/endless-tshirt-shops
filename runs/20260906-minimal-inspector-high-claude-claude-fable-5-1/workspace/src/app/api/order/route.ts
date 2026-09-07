import { NextResponse } from "next/server";
import Stripe from "stripe";
import { fulfillPaymentIntent } from "@/lib/fulfill";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

/**
 * GET /api/order?payment_intent=pi_...&client_secret=pi_..._secret_...
 *
 * Called by the browser after payment. Reports the order's state and, if the
 * payment has succeeded but the webhook has not fulfilled it yet, fulfils it
 * right here (idempotently). The client secret doubles as proof that the
 * caller was party to the payment.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("payment_intent") ?? "";
  const secret = url.searchParams.get("client_secret") ?? "";
  if (!/^pi_[A-Za-z0-9]+$/.test(id) || !secret.startsWith(`${id}_secret_`)) {
    return NextResponse.json({ error: "Missing or invalid payment reference" }, { status: 400 });
  }

  try {
    const pi = await stripe().paymentIntents.retrieve(id);
    if (pi.client_secret !== secret) {
      return NextResponse.json({ error: "Missing or invalid payment reference" }, { status: 403 });
    }
    const result = await fulfillPaymentIntent(pi, url.origin);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof Stripe.errors.StripeError && err.statusCode === 404) {
      return NextResponse.json({ error: "Unknown payment" }, { status: 404 });
    }
    console.error("[order] error", err);
    return NextResponse.json({ error: "Could not look up your order" }, { status: 500 });
  }
}
