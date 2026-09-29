import { NextResponse } from "next/server";
import { fulfillSession } from "@/lib/prodigi";
import { getBaseUrl } from "@/lib/baseUrl";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Called by the success page after redirect from Stripe Checkout. Acts as a
 * backup to the webhook: fulfillment is idempotent, so whichever path gets
 * there first wins. The session id is a high-entropy capability token only
 * the payer receives, and payment_status is re-checked server-side.
 */
export async function POST(req: Request) {
  let sessionId: string | undefined;
  try {
    const body = await req.json();
    sessionId = typeof body?.session_id === "string" ? body.session_id : undefined;
  } catch {
    /* fall through */
  }
  if (!sessionId || !sessionId.startsWith("cs_")) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  try {
    const result = await fulfillSession(sessionId, getBaseUrl(req));
    return NextResponse.json({
      status: result.alreadyFulfilled ? "already_fulfilled" : "fulfilled",
      prodigiOrderId: result.prodigiOrderId,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Fulfillment failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
