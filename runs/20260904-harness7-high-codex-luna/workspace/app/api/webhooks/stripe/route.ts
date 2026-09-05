import Stripe from "stripe";
import { fulfillSession } from "../../../../lib/fulfillment";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) return Response.json({ error: "Stripe webhook is not configured." }, { status: 503 });
  const stripe = new Stripe(secretKey);
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "Missing Stripe signature." }, { status: 400 });
  let event: Stripe.Event;
  try { event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret); }
  catch { return Response.json({ error: "Invalid Stripe signature." }, { status: 400 }); }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const origin = process.env.SITE_URL;
    if (origin) await fulfillSession(stripe, session.id, origin);
  }
  return Response.json({ received: true });
}
