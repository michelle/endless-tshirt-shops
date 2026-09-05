import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { ensureFulfilled } from "@/lib/fulfill";

export const runtime = "nodejs";

/**
 * POST /api/stripe/webhook
 * Listens for checkout.session.completed (and async_payment_succeeded) and
 * sends the moment to the printer. Signature-verified; idempotent.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET is not configured." }, { status: 503 });
  }
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    return NextResponse.json({ error: `Bad signature: ${(err as Error).message}` }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      try {
        const result = await ensureFulfilled(session.id);
        console.log(`[webhook] ${event.type} ${session.id} → ${result.state}${result.order ? ` prodigi=${result.order.id}` : ""}${result.reason ? ` (${result.reason})` : ""}`);
        return NextResponse.json({ received: true, fulfillment: result.state, prodigiOrderId: result.order?.id ?? null });
      } catch (err) {
        console.error(`[webhook] fulfilment failed for ${session.id}`, err);
        // 500 → Stripe retries with backoff. Fulfilment is idempotent so that's safe.
        return NextResponse.json({ error: (err as Error).message }, { status: 500 });
      }
    }
    default:
      return NextResponse.json({ received: true, ignored: event.type });
  }
}
