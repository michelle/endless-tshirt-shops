import { stripe } from "@/lib/stripe";
import { required } from "@/lib/config";
import { fulfill } from "@/lib/orders";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature)
    return Response.json({ error: "Missing signature" }, { status: 400 });
  let event;
  try {
    event = stripe().webhooks.constructEvent(
      await request.text(),
      signature,
      required("STRIPE_WEBHOOK_SECRET"),
    );
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }
  if (
    [
      "checkout.session.completed",
      "checkout.session.async_payment_succeeded",
    ].includes(event.type)
  ) {
    const session = event.data
      .object as import("stripe").Stripe.Checkout.Session;
    if (session.metadata?.store_id !== required("STORE_ID"))
      return Response.json({ received: true, ignored: true });
    try {
      await fulfill(session.id);
    } catch {
      return Response.json(
        { error: "Fulfillment pending; retry required" },
        { status: 500 },
      );
    }
  }
  return Response.json({ received: true });
}
