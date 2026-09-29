// Stripe webhook: verified payment_intent.succeeded events trigger Prodigi fulfilment.
// Shirts are only ever submitted to Prodigi after Stripe confirms payment.
import { stripe, fulfillOrder } from "@/lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const payload = await req.text();
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return Response.json({ error: "Missing signature or webhook secret." }, { status: 400 });
  }
  let event: any;
  try {
    event = stripe().webhooks.constructEvent(payload, sig, secret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err?.message);
    return Response.json({ error: `Webhook verification failed: ${err?.message}` }, { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object;
    const piId: string = pi.id;
    try {
      const result = await fulfillOrder(piId);
      if (!result.ok) {
        console.error(`Fulfillment failed for ${piId}: ${result.detail}`);
        // Ack so Stripe doesn't spam retries for permanent failures; the
        // confirmation page's reconcile call can retry safely.
        return Response.json({ received: true, fulfilled: false, detail: result.detail });
      }
      return Response.json({ received: true, fulfilled: true, prodigiId: result.prodigiId });
    } catch (err: any) {
      console.error(`Fulfillment error for ${piId}:`, err?.message ?? err);
      return Response.json({ received: true, fulfilled: false, detail: String(err?.message ?? err) }, { status: 500 });
    }
  }

  return Response.json({ received: true, ignored: event.type });
}
