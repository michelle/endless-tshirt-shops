import { NextResponse } from "next/server";
import { ensureFulfilled, loadOrder } from "@/lib/fulfill";

export const runtime = "nodejs";

/**
 * Order status JSON for the confirmation page. If the session is paid but the
 * webhook has not placed the Prodigi order yet (or is misconfigured), place it
 * here. ensureFulfilled is idempotent so the webhook and this path cannot double-order.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
    return NextResponse.json({ error: "bad session id" }, { status: 400 });
  }
  let order = await loadOrder(sessionId);
  if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });

  let fulfilError: string | null = null;
  if (order.paymentStatus === "paid" && !order.prodigi) {
    try {
      await ensureFulfilled(sessionId);
      order = (await loadOrder(sessionId)) ?? order;
    } catch (e) {
      fulfilError = (e as Error).message;
      console.error(`[order] fulfilment failed for ${sessionId}:`, e);
    }
  }
  return NextResponse.json({ ...order, fulfilError }, { headers: { "Cache-Control": "no-store" } });
}
