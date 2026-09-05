import { stripe } from "@/lib/stripe";
import { fulfillCheckout } from "@/lib/fulfillment";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret)
    return new Response("Webhook is not configured", { status: 503 });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });
  let event;
  try {
    event = stripe().webhooks.constructEvent(
      await request.text(),
      signature,
      secret,
    );
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }
  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object;
    if (
      session.metadata?.store !== "datetime-v1" ||
      session.payment_status !== "paid"
    )
      return Response.json({ received: true });
    try {
      await fulfillCheckout(session.id);
    } catch (e) {
      console.error("Fulfillment needs retry", {
        session: session.id,
        error: e instanceof Error ? e.message : "Unknown error",
      });
      return new Response("Fulfillment pending; please retry", { status: 500 });
    }
  }
  return Response.json({ received: true });
}
