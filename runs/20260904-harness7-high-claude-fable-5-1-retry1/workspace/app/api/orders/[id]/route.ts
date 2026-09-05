import { NextRequest, NextResponse } from "next/server";
import { ensureFulfilled, refreshFulfillment, retrieveIntent, toOrderView } from "@/lib/fulfill";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/orders/{paymentIntentId}
 * Returns the order view. If the payment succeeded and no Prodigi order exists yet,
 * submits it (idempotent), so the success page always converges on a fulfilled order
 * even if the webhook is late.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let pi = await retrieveIntent(id);
  if (!pi) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  pi = await ensureFulfilled(pi);
  if (req.nextUrl.searchParams.get("refresh") === "1") pi = await refreshFulfillment(pi);
  return NextResponse.json(toOrderView(pi), { headers: { "Cache-Control": "no-store" } });
}

/** POST /api/orders/{paymentIntentId} — explicit "fulfill now" from the client after confirmPayment. */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let pi = await retrieveIntent(id);
  if (!pi) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  pi = await ensureFulfilled(pi);
  return NextResponse.json(toOrderView(pi), { headers: { "Cache-Control": "no-store" } });
}
