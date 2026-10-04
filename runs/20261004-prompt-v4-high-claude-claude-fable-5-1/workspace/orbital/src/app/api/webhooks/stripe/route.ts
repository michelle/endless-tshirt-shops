import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { ensureProdigiOrder } from "@/lib/fulfil";
import { siteUrl } from "@/lib/sign";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Stripe → us. A shirt is only ever sent to Prodigi from here (or from the
 * order page as a fallback), and only when Stripe reports the session as paid.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "webhook secret not configured" }, { status: 500 });
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    const raw = await req.text();
    event = stripe().webhooks.constructEvent(raw, sig, secret);
  } catch (e) {
    console.error("webhook signature failed", e);
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status !== "paid") {
      // e.g. a delayed payment method; wait for async_payment_succeeded
      return NextResponse.json({ received: true, deferred: true });
    }
    try {
      const result = await ensureProdigiOrder(session.id, siteUrl(req));
      console.log("fulfil", session.id, result.status, "order" in result ? result.order.id : "");
      return NextResponse.json({ received: true, result: result.status });
    } catch (e) {
      console.error("fulfilment failed", session.id, e);
      // 500 makes Stripe retry with backoff; ensureProdigiOrder is idempotent.
      return NextResponse.json({ error: "fulfilment failed" }, { status: 500 });
    }
  }
  return NextResponse.json({ received: true });
}
