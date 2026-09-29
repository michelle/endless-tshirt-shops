import { NextResponse } from "next/server";
import { getStripe } from "../../../../lib/stripe.js";
import { fulfillSession } from "../../../../lib/fulfill.js";

export const runtime = "nodejs";

export async function POST(req) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }
  const body = await req.text();
  const sig = req.headers.get("stripe-signature") || "";

  let event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, secret);
  } catch (e) {
    return NextResponse.json({ error: `Invalid signature: ${e.message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const url = new URL(req.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    try {
      const result = await fulfillSession(session.id, baseUrl);
      console.log("fulfillment result", session.id, JSON.stringify(result.reason || result.outcome || (result.fulfilled ? "ok" : "noop")));
      return NextResponse.json({ received: true, fulfilled: result.fulfilled, reason: result.reason || result.outcome });
    } catch (e) {
      console.error("fulfillment error", e);
      // 500 -> Stripe retries the webhook
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
