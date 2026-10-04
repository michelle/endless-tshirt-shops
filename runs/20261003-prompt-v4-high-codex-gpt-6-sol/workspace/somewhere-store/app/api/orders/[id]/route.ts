import { fulfillPaidOrder, getOrder } from "@/lib/store";

export const runtime = "edge";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const url = new URL(request.url);
  if (!/^[0-9a-f-]{36}$/.test(id)) return Response.json({ error: "Order not found" }, { status: 404 });
  try {
    const order = await getOrder(id);
    if (!order || !order.stripe_session || url.searchParams.get("session_id") !== order.stripe_session) {
      return Response.json({ error: "Order not found" }, { status: 404 });
    }
    const result = await fulfillPaidOrder(id, url.origin);
    return Response.json({ status: result.status, reference: id.slice(0, 8).toUpperCase() });
  } catch (error) {
    console.error("Order lookup error", error);
    return Response.json({ error: "Order status is temporarily unavailable" }, { status: 503 });
  }
}
