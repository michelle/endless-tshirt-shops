import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { fulfillStripeSession } from "@/lib/fulfill";

export const runtime = "nodejs";

/**
 * POST /api/stripe-webhook
 *
 * Registered for `checkout.session.completed`. Verifies the signature,
 * re-fetches the session from the Stripe API (never trusting the payload),
 * and — only if payment_status === "paid" — sends the shirt to Prodigi.
 * Idempotent via the Prodigi idempotency key (stripe session id), so
 * double delivery or a race with the /success page is harmless.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "webhook not configured" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    return NextResponse.json(
      { error: `signature verification failed: ${err instanceof Error ? err.message : "unknown"}` },
      { status: 400 }
    );
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  const sessionFromEvent = event.data.object as Stripe.Checkout.Session;
  // Re-fetch from the API so fulfilment decisions use authoritative state.
  const session = await getStripe().checkout.sessions.retrieve(sessionFromEvent.id);

  const result = await fulfillStripeSession(session);

  if (!result.ok) {
    // Returning 500 makes Stripe retry — the right move for transient
    // failures. "unpaid" sessions are not an error for this endpoint.
    if (result.status === "unpaid") {
      return NextResponse.json({ received: true, skipped: result.status });
    }
    return NextResponse.json(
      { error: result.error ?? result.status },
      { status: 500 }
    );
  }

  return NextResponse.json({
    received: true,
    status: result.status,
    orderId: result.orderId,
  });
}
