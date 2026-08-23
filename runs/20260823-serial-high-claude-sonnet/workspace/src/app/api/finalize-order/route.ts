import { NextResponse } from "next/server";
import { placeOrder, ScalablePressError } from "@/lib/scalablepress";
import { stripe } from "@/lib/stripe";

export const maxDuration = 30;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const paymentIntentId = (body as Record<string, unknown> | null)?.paymentIntentId;
  if (typeof paymentIntentId !== "string" || !paymentIntentId) {
    return NextResponse.json({ error: "Missing paymentIntentId" }, { status: 400 });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      return NextResponse.json(
        { error: `Payment has not completed (status: ${paymentIntent.status})` },
        { status: 402 },
      );
    }

    // Idempotent: if we already fulfilled this payment, return the same order.
    if (paymentIntent.metadata.spOrderId) {
      return NextResponse.json({ orderId: paymentIntent.metadata.spOrderId });
    }

    const orderToken = paymentIntent.metadata.orderToken;
    if (!orderToken) {
      return NextResponse.json(
        { error: "Order is missing print details and cannot be fulfilled." },
        { status: 500 },
      );
    }

    const orderId = await placeOrder(orderToken);

    await stripe.paymentIntents.update(paymentIntentId, {
      metadata: { ...paymentIntent.metadata, spOrderId: orderId },
    });

    return NextResponse.json({ orderId });
  } catch (err) {
    if (err instanceof ScalablePressError) {
      console.error(`[scalable-press:${err.step}]`, err.body);
      return NextResponse.json(
        {
          error:
            "Your payment succeeded, but we couldn't place the print order. Our team will follow up.",
        },
        { status: 502 },
      );
    }
    console.error("[finalize-order]", err);
    return NextResponse.json({ error: "Something went wrong finalizing your order." }, {
      status: 500,
    });
  }
}
