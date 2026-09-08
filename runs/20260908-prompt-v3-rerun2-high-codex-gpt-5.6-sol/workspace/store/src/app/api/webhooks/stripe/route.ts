import { fulfillCheckoutSession } from "@/lib/fulfillment";
import { stripeClient } from "@/lib/stripe";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return new Response("Webhook not configured", { status: 400 });
  try {
    const event = await stripeClient().webhooks.constructEventAsync(await request.text(), signature, secret);
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      await fulfillCheckoutSession(event.data.object.id);
    }
    return new Response("ok");
  } catch (error) {
    console.error("stripe_webhook_error", error);
    return new Response("Webhook processing failed", { status: 400 });
  }
}
