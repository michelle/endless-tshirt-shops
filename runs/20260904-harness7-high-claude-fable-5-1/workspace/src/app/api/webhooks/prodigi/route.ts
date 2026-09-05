import { NextResponse } from "next/server";
import { syncProdigiStatus } from "@/lib/fulfillment";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Prodigi order-status callback. Prodigi callbacks are unsigned, so we treat
 * the payload as a hint only: we re-fetch the order from Prodigi's API using
 * our own key and cache the trustworthy status on the PaymentIntent.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { order?: { id?: string; merchantReference?: string }; merchantReference?: string }
    | null;
  const ref = body?.order?.merchantReference ?? body?.merchantReference;
  if (!ref || !/^pi_[A-Za-z0-9]+$/.test(ref)) {
    return NextResponse.json({ received: true, ignored: true });
  }
  try {
    const stage = await syncProdigiStatus(ref);
    return NextResponse.json({ received: true, stage });
  } catch (err) {
    console.error("[prodigi-callback] sync failed", err);
    return NextResponse.json({ received: true, error: "sync failed" }, { status: 500 });
  }
}
