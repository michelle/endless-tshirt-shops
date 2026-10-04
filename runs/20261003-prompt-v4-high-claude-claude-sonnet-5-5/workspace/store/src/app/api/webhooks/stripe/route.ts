import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { fulfillSession } from "@/lib/fulfillment";
import { siteOrigin } from "@/lib/origin";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");
  if (!secret || !sig) return new NextResponse("Webhook not configured", { status: 400 });

  let event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), sig, secret);
  } catch {
    return new NextResponse("Invalid signature", { status: 400 });
  }

  // Prodigi is only ever called from here (or the order-page fallback) and only for paid sessions.
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object;
    try {
      const result = await fulfillSession(session.id, await siteOrigin());
      return NextResponse.json({ received: true, result: result.state });
    } catch (e: any) {
      console.error("fulfillment error, asking Stripe to retry", session.id, e?.message);
      return new NextResponse("Fulfillment error", { status: 500 });
    }
  }
  return NextResponse.json({ received: true });
}
