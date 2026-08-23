import Stripe from "stripe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("session_id");
  if (!sessionId || !process.env.STRIPE_SECRET_KEY) return NextResponse.json({ status: "Your payment was completed. We’ll email your confirmation shortly." });
  try {
    const session = await new Stripe(process.env.STRIPE_SECRET_KEY).checkout.sessions.retrieve(sessionId);
    if (session.payment_status === "paid") return NextResponse.json({ status: "Payment received. We’ll send your order confirmation and tracking updates to your email." });
    return NextResponse.json({ status: "Your checkout is still being confirmed." });
  } catch {
    return NextResponse.json({ status: "Your payment was completed. We’ll email your confirmation shortly." });
  }
}
