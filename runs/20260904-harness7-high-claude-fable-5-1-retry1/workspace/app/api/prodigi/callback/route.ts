import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import type { ProdigiOrder } from "@/lib/prodigi";
import { retrieveIntent, summarizeStatus } from "@/lib/fulfill";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/prodigi/callback — Prodigi order status CloudEvents.
 * Mirrors stage/status onto the PaymentIntent metadata so the order page can show it.
 * Protected by an optional shared token (PRODIGI_CALLBACK_TOKEN) in the query string.
 */
export async function POST(req: NextRequest) {
  const expected = process.env.PRODIGI_CALLBACK_TOKEN;
  if (expected && req.nextUrl.searchParams.get("token") !== expected) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  let event: { type?: string; data?: { order?: ProdigiOrder } };
  try {
    event = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const order = event.data?.order;
  const ref = order?.merchantReference;
  if (!order || !ref) return NextResponse.json({ received: true, ignored: true });

  const pi = await retrieveIntent(ref);
  if (!pi || pi.metadata?.prodigi_order_id !== order.id) return NextResponse.json({ received: true, ignored: true });

  await stripe().paymentIntents.update(pi.id, {
    metadata: {
      prodigi_stage: order.status?.stage ?? "",
      prodigi_status: summarizeStatus(order),
      prodigi_last_event: (event.type ?? "").slice(0, 100),
    },
  });
  console.info("[prodigi] callback", event.type, order.id, order.status?.stage);
  return NextResponse.json({ received: true });
}
