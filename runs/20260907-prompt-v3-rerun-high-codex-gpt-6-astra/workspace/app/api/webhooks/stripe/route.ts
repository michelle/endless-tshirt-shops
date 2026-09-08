import { NextResponse } from "next/server";
import { stripeClient } from "@/lib/config";
import { fulfill } from "@/lib/fulfill";
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret)
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 503 },
    );
  let event;
  try {
    event = stripeClient().webhooks.constructEvent(
      await request.text(),
      request.headers.get("stripe-signature") || "",
      secret,
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  if (
    [
      "checkout.session.completed",
      "checkout.session.async_payment_succeeded",
    ].includes(event.type)
  ) {
    try {
      await fulfill((event.data.object as { id: string }).id);
    } catch (error) {
      console.error("fulfillment_failed", {
        event: event.id,
        type: error instanceof Error ? error.name : "Error",
      });
      return NextResponse.json(
        { error: "Fulfillment pending retry" },
        { status: 500 },
      );
    }
  }
  return NextResponse.json({ received: true });
}
