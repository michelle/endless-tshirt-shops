import { stripe } from "@/lib/stripe";
import { required } from "@/lib/config";
import { safeEqual } from "@/lib/security";
import { fulfill } from "@/lib/orders";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: Request) {
  if (
    !process.env.CRON_SECRET ||
    !safeEqual(
      request.headers.get("authorization") ?? "",
      `Bearer ${required("CRON_SECRET")}`,
    )
  )
    return new Response("Unauthorized", { status: 401 });
  let checked = 0,
    retried = 0,
    failed = 0;
  const started = Date.now();
  for await (const s of stripe().checkout.sessions.list({
    created: { gte: Math.floor(Date.now() / 1000) - 7 * 86400 },
    limit: 100,
  })) {
    if (++checked > 500 || Date.now() - started > 40000) break;
    if (
      s.metadata?.store_id === required("STORE_ID") &&
      s.payment_status === "paid" &&
      !s.metadata.prodigi_order_id &&
      s.metadata.fulfillment_state !== "refunded"
    ) {
      try {
        await fulfill(s.id);
        retried++;
      } catch {
        failed++;
      }
    }
  }
  return Response.json({ checked, retried, failed });
}
