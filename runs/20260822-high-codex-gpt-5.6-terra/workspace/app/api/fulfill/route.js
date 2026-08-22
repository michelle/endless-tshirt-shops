import { fulfillCheckoutSession } from "../../../lib/checkout-fulfillment";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const { sessionId } = await request.json();
    const fulfillment = await fulfillCheckoutSession(sessionId);
    return Response.json({ ok: true, fulfillment: { orderId: fulfillment.orderId, mode: fulfillment.mode } });
  } catch (error) {
    console.error("fulfill", error);
    return Response.json({ error: error.message || "We could not submit the order.", detail: error.detail }, { status: error.status || 500 });
  }
}
