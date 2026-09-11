import { NextRequest } from "next/server";
import { getOrder } from "@/lib/orders";
import { getProdigiOrder } from "@/lib/prodigi";

export const dynamic = "force-dynamic";

/** GET /api/orders/:sessionId → storefront record + live Prodigi status. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/orders/[id]">) {
  const { id } = await ctx.params;
  const order = await getOrder(id);
  if (!order) return Response.json({ error: "Not found" }, { status: 404 });
  let prodigi = null;
  if (order.prodigiOrderId) {
    try {
      const p = await getProdigiOrder(order.prodigiOrderId);
      if (p) prodigi = { stage: p.status.stage, details: p.status.details, issues: p.status.issues, shipments: p.shipments ?? [] };
    } catch (err) {
      prodigi = { error: err instanceof Error ? err.message : String(err) };
    }
  }
  // Never leak the customer's contact details through this endpoint.
  const { email: _e, customerName: _n, ...safe } = order;
  void _e; void _n;
  return Response.json({ order: safe, prodigi });
}
