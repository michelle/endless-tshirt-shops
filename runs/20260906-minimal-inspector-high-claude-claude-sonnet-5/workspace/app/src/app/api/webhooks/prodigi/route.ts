import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

// Prodigi calls this URL (set as `callbackUrl` on order creation) as a
// CloudEvent whenever an order's stage or shipment status changes. The
// event's `data.order` is the full order object, and `merchantReference` is
// the Stripe PaymentIntent id we placed the order under — so we can update
// that PaymentIntent's metadata directly, with no separate order database.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const order = body?.data?.order ?? body?.order ?? body;

  const merchantReference: string | undefined = order?.merchantReference;
  const stage: string | undefined = order?.status?.stage;
  const prodigiOrderId: string | undefined = order?.id;

  if (!merchantReference || !merchantReference.startsWith("pi_")) {
    console.warn("[prodigi webhook] no usable merchantReference on payload", body);
    return NextResponse.json({ received: true });
  }

  try {
    await stripe.paymentIntents.update(merchantReference, {
      metadata: {
        ...(prodigiOrderId ? { prodigiOrderId } : {}),
        ...(stage ? { prodigiStage: stage } : {}),
      },
    });
  } catch (err) {
    console.error("[prodigi webhook] failed to update PaymentIntent:", err);
    // Swallow — Prodigi doesn't need to retry on our persistence hiccups.
  }

  return NextResponse.json({ received: true });
}
