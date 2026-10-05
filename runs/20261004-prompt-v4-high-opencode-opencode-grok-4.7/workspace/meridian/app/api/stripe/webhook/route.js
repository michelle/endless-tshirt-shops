import { fulfillPaidSession } from "../../../../lib/fulfill.js";
import { getStripe } from "../../../../lib/stripeClient.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req) {
  const raw = await req.text();
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;
  try {
    if (secret && sig) {
      event = getStripe().webhooks.constructEvent(raw, sig, secret);
    } else {
      event = JSON.parse(raw);
    }
  } catch (err) {
    return new Response(`Webhook error: ${err.message}`, { status: 400 });
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const sessionId = event.data?.object?.id;
    if (sessionId) {
      try {
        const result = await fulfillPaidSession(sessionId);
        console.log("[meridian] webhook", event.type, result.status, result.prodigiOrderId || "");
      } catch (err) {
        console.error("[meridian] webhook fulfill", err);
        return Response.json({ received: true, error: err.message }, { status: 500 });
      }
    }
  }

  return Response.json({ received: true });
}
