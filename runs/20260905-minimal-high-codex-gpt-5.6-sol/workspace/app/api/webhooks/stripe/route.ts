import { NextResponse } from "next/server";
import { fulfillCheckoutSession } from "@/lib/fulfillment";
import { getStripe } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    const event = stripe.webhooks.constructEvent(
      await request.text(),
      signature,
      webhookSecret,
    );

    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session = event.data.object;
      if (
        session.payment_status === "paid" ||
        session.payment_status === "no_payment_required"
      ) {
        await fulfillCheckoutSession(session.id);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[stripe-webhook]", error);
    return NextResponse.json({ error: "Webhook handling failed." }, { status: 400 });
  }
}
