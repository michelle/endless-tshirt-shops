// Read-side endpoint that returns whatever we know about a Stripe checkout
// session + (if known) the Prodigi order. Used by the post-checkout success
// page to display the order and its Prodigi status without tying the UI to
// Stripe's own dashboard.

import { NextResponse } from "next/server";

import { getOrderRecord } from "@/lib/store";
import { getProdigiOrder } from "@/lib/prodigi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const id = params.id;
  if (!id || !/^cs_(test|live)_/.test(id)) {
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  }

  const rec = getOrderRecord(id);
  if (!rec) {
    return NextResponse.json({ record: null });
  }

  // If we already have a Prodigi order id, poll for fresh state.
  let prodigiStatus: unknown = undefined;
  if (rec.prodigiOrderId) {
    try {
      const r = await getProdigiOrder(rec.prodigiOrderId);
      prodigiStatus = r.order?.status ?? null;
    } catch (err) {
      prodigiStatus = err instanceof Error ? err.message : "prodigi fetch failed";
    }
  }

  return NextResponse.json({
    record: rec,
    prodigiStatus,
  });
}
