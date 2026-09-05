import { NextResponse } from "next/server";
import { stripe, stripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";
export const revalidate = 60;

/** GET /api/stats — how many moments have been claimed (approximate, cached). */
export async function GET() {
  if (!stripeConfigured()) return NextResponse.json({ claimed: null });
  try {
    const list = await stripe().checkout.sessions.list({ status: "complete", limit: 100 });
    const paid = list.data.filter((s) => s.payment_status === "paid").length;
    return NextResponse.json({ claimed: paid, more: list.has_more }, { headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=300" } });
  } catch {
    return NextResponse.json({ claimed: null });
  }
}
