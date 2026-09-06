import { NextResponse, type NextRequest } from "next/server";
import { getOrder } from "@/lib/prodigi";
import { syncProdigiStatus } from "@/lib/fulfill";

export const runtime = "nodejs";

/**
 * Prodigi posts the order here whenever its status changes.
 * The callback isn't signed, so we only trust the id and re-fetch the order.
 */
export async function POST(req: NextRequest) {
  let id: string | undefined;
  try {
    const body = (await req.json()) as { id?: string; order?: { id?: string } };
    id = body?.id || body?.order?.id;
  } catch {
    // fall through
  }
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "No order id" }, { status: 400 });
  }
  try {
    const order = await getOrder(id);
    await syncProdigiStatus(order);
    console.log(`[prodigi] ${order.id} -> ${order.status?.stage}`);
  } catch (err) {
    console.error(`[prodigi] callback for ${id} failed:`, err);
    return NextResponse.json({ error: "Could not sync" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
