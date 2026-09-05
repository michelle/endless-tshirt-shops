import { NextResponse } from "next/server";
import { getOrderStatus } from "@/lib/fulfillment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/orders/:paymentIntentId — payment + print status for the order page. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^pi_[A-Za-z0-9]+$/.test(id)) {
    return NextResponse.json({ error: { message: "Invalid order id" } }, { status: 400 });
  }
  try {
    const status = await getOrderStatus(id);
    return NextResponse.json(status);
  } catch (err) {
    const code = (err as { statusCode?: number }).statusCode;
    if (code === 404) return NextResponse.json({ error: { message: "Order not found" } }, { status: 404 });
    console.error(`[orders] ${id}`, err);
    return NextResponse.json({ error: { message: "Could not load order" } }, { status: 500 });
  }
}
