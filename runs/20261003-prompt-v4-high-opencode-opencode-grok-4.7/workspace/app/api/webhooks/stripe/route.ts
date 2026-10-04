import { NextResponse } from "next/server";
import { fulfillSession, originFrom } from "@/lib/fulfill";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook secret is not set" }, { status: 500 });
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  const payload = await req.text();
  let event;
  try {
    event = stripe().webhooks.constructEvent(payload, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as { id?: string };
    if (session.id) {
      try {
        await fulfillSession(session.id, originFrom(req));
      } catch (error) {
        console.error("fulfill failed", error);
        return NextResponse.json({ error: "Fulfillment failed" }, { status: 500 });
      }
    }
  }
  return NextResponse.json({ received: true });
}
