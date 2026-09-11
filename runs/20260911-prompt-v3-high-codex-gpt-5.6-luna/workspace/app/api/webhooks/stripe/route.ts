import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { fulfillStripeSession } from "../../../../lib/fulfillment";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook secret is not configured." }, { status: 503 });
  const signature = request.headers.get("stripe-signature") ?? "";
  const rawBody = await request.text();
  if (!verifySignature(rawBody, signature, secret)) return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  const event = JSON.parse(rawBody);
  if (event.type === "checkout.session.completed" && event.data?.object?.id) {
    try {
      await fulfillStripeSession(event.data.object.id, request.nextUrl.origin);
    } catch (error) {
      console.error("Stripe webhook fulfillment failed", error);
      return NextResponse.json({ error: error instanceof Error ? error.message : "Fulfillment failed." }, { status: 500 });
    }
  }
  return NextResponse.json({ received: true });
}

function verifySignature(payload: string, header: string, secret: string) {
  const values = Object.fromEntries(header.split(",").map((item) => item.split("=", 2)));
  if (!values.t || !values.v1) return false;
  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(values.t));
  if (!Number.isFinite(age) || age > 300) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${values.t}.${payload}`).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(values.v1));
}
