import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { fulfillSession } from "@/lib/orders";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");
  if (!secret || !sig) return new Response("Webhook not configured", { status: 400 });

  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(payload, sig, secret);
  } catch (e) {
    console.warn("[webhook] bad signature", (e as Error).message);
    return new Response("Bad signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object;
        // Only paid sessions are fulfilled; fulfillSession re-verifies with Stripe as well.
        if (session.payment_status === "paid") {
          const result = await fulfillSession(session.id);
          console.log(`[webhook] ${event.type} ${session.id} ->`, result);
        } else {
          console.log(`[webhook] ${event.type} ${session.id} not paid yet (${session.payment_status})`);
        }
        break;
      }
      case "checkout.session.async_payment_failed":
        console.warn(`[webhook] async payment failed for ${event.data.object.id}`);
        break;
      default:
        break;
    }
  } catch (e) {
    // Non-2xx makes Stripe retry with backoff; fulfilment is idempotent.
    console.error(`[webhook] fulfilment failed for ${event.id}`, e);
    return new Response("Fulfilment failed", { status: 500 });
  }
  return Response.json({ received: true });
}
