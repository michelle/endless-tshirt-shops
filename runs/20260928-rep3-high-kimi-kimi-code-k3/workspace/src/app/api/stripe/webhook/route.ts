import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { fulfillSession } from "@/lib/prodigi";
import { getBaseUrl } from "@/lib/baseUrl";

export const runtime = "nodejs";

async function getVerifiedEvent(req: Request, rawBody: string): Promise<Stripe.Event | null> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");

  if (webhookSecret && signature) {
    // Preferred path: verify the webhook signature.
    return stripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  }

  // Fallback: re-fetch the event from the Stripe API. Only events belonging
  // to our account can be retrieved, which authenticates the payload.
  const parsed = JSON.parse(rawBody) as { id?: string; livemode?: boolean };
  if (!parsed.id || parsed.livemode) return null;
  return stripe().events.retrieve(parsed.id);
}

export async function POST(req: Request) {
  const rawBody = await req.text();

  let event: Stripe.Event | null;
  try {
    event = await getVerifiedEvent(req, rawBody);
  } catch (e) {
    console.error("Webhook verification failed:", e);
    return NextResponse.json({ error: "Verification failed" }, { status: 400 });
  }
  if (!event) return NextResponse.json({ error: "Unverified event" }, { status: 400 });

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === "paid") {
      try {
        const result = await fulfillSession(session.id, getBaseUrl(req));
        console.log("Fulfillment result:", session.id, JSON.stringify(result));
      } catch (e) {
        // Return 500 so Stripe retries the webhook.
        console.error("Fulfillment failed:", session.id, e);
        return NextResponse.json({ error: "Fulfillment failed" }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}
