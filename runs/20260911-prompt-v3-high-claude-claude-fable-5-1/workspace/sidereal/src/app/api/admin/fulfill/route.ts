import { NextRequest } from "next/server";
import { fulfillCheckoutSession } from "@/lib/fulfill";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST /api/admin/fulfill { id } — re-run fulfilment for a paid session (admin only). */
export async function POST(req: NextRequest) {
  const expected = process.env.ADMIN_TOKEN;
  const auth = req.headers.get("authorization") ?? "";
  if (!expected || auth !== `Bearer ${expected}`) return Response.json({ error: "Unauthorised" }, { status: 401 });
  const { id } = (await req.json()) as { id?: string };
  if (!id || !/^cs_[A-Za-z0-9_]+$/.test(id)) return Response.json({ error: "Bad id" }, { status: 400 });
  try {
    const rec = await fulfillCheckoutSession(id);
    return Response.json({ order: rec });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
