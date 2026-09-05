import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id?.startsWith("cs_")) return NextResponse.json({ error: "Invalid order" }, { status: 400 });
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  const session = await new Stripe(key).checkout.sessions.retrieve(id);
  return NextResponse.json({ paid: session.payment_status === "paid", email: session.customer_details?.email, moment: session.metadata?.moment });
}
