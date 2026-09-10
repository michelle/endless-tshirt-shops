import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getPendingOrder, getOrderResult } from "@/lib/store";

export const runtime = "nodejs";

let _stripe;
function getStripe() {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return _stripe;
}

// Read-only status check for the success page. Talks to Stripe directly
// (source of truth for payment) rather than trusting anything client-side.
export async function GET(req) {
  const sessionId = new URL(req.url).searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  let session;
  try {
    session = await getStripe().checkout.sessions.retrieve(sessionId);
  } catch {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const { orderRecordUrl } = session.metadata || {};
  const [order, result] = await Promise.all([
    orderRecordUrl ? getPendingOrder(orderRecordUrl) : null,
    orderRecordUrl ? getOrderResult(orderRecordUrl) : null,
  ]);

  return NextResponse.json({
    paid: session.payment_status === "paid",
    email: session.customer_details?.email || null,
    items: (order?.items || []).map((i) => ({
      phrase: i.phrase,
      subtitle: i.subtitle,
      copies: i.copies,
      color: i.attributes?.color,
      size: i.attributes?.size,
    })),
    fulfillment: result?.status || (session.payment_status === "paid" ? "processing" : null),
    prodigiOrderId: result?.prodigiOrderId || null,
  });
}
