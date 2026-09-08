import { NextResponse } from "next/server";
import { fulfill } from "@/lib/fulfill";
import { prodigi } from "@/lib/prodigi";
import { mode } from "@/lib/config";
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("session_id");
  if (!id || !/^cs_(test_|live_)?[A-Za-z0-9]{12,250}$/.test(id))
    return NextResponse.json({ error: "Invalid order link" }, { status: 400 });
  try {
    const result = await fulfill(id);
    let printStatus = null;
    let tracking: unknown[] = [];
    if (result.orderId) {
      try {
        const data = await prodigi(
          "orders/" + encodeURIComponent(result.orderId),
        );
        printStatus = data.order?.status;
        tracking = (data.order?.shipments || [])
          .map((s: { tracking?: unknown }) => s.tracking)
          .filter(Boolean);
      } catch {}
    }
    return NextResponse.json(
      {
        paid: result.paid,
        status: result.status,
        orderId: result.orderId,
        design: result.session?.metadata?.design
          ? JSON.parse(result.session.metadata.design)
          : undefined,
        printStatus,
        tracking,
        test: mode() === "test",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "We could not refresh your order. If you paid, your order is saved with Stripe and fulfillment will retry automatically. Please keep this link.",
      },
      { status: 503 },
    );
  }
}
