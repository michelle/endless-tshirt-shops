import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Stripe webhook: places the Prodigi order when a Checkout Session is paid.
 * The success page does the same thing, so whichever arrives first wins and the other is a no-op
 * (Prodigi idempotency key = the session id).
 */
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: "Stripe is not configured" }, { status: 501 });
  const { stripe, finalizeStripeSession } = await import("@/lib/stripe");
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  const raw = await req.text();
  let event;
  try {
    event = stripe().webhooks.constructEvent(raw, sig, secret);
  } catch (e) {
    return NextResponse.json({ error: `Bad signature: ${e instanceof Error ? e.message : e}` }, { status: 400 });
  }
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as { id: string };
    try {
      await finalizeStripeSession(session.id);
    } catch (e) {
      console.error("webhook finalize failed", session.id, e);
      // 500 makes Stripe retry, which is what we want if Prodigi was briefly unavailable.
      return NextResponse.json({ error: "finalize failed" }, { status: 500 });
    }
  }
  return NextResponse.json({ received: true });
}
