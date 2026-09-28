import { SESSION_ID_RE, fulfillSession, orderSummary } from "@/lib/orders";

export const runtime = "nodejs";
export const maxDuration = 60;

const FALLBACK_AFTER_SECONDS = 45;

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("session_id") ?? "";
  if (!SESSION_ID_RE.test(id)) return Response.json({ error: "Order not found" }, { status: 404 });
  try {
    let summary = await orderSummary(id);
    // Safety net: if the webhook hasn't delivered a while after payment, fulfil from here.
    // fulfillSession is idempotent (Stripe re-check + Prodigi idempotencyKey).
    if (summary.paid && !summary.prodigiOrderId && Date.now() / 1000 - summary.paidAt > FALLBACK_AFTER_SECONDS) {
      try {
        await fulfillSession(id);
        summary = await orderSummary(id);
      } catch (e) {
        console.error("[order] fallback fulfilment failed", e);
      }
    }
    return Response.json(summary, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[order] lookup failed", e);
    return Response.json({ error: "Order not found" }, { status: 404 });
  }
}
