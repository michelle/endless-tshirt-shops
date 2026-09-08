import { NextRequest } from "next/server";
import { getOrderView } from "@/lib/orders";

export const dynamic = "force-dynamic";

/** JSON order status used by the order page to poll while the printer picks up the job. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/orders/[id]">) {
  const { id } = await ctx.params;
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) return Response.json({ error: "Not found" }, { status: 404 });
  try {
    const view = await getOrderView(id);
    return Response.json(view);
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Not found" }, { status: 404 });
  }
}
