// app/api/prodigi-callback/route.ts
// Optional: when Prodigi sends a status-change callback we update the
// persisted order so /success can show progress. We accept any well-
// formed JSON and look up the order by id parameter.

import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/services";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const orderId = sp.get("orderId");
  if (!orderId) {
    return NextResponse.json({ error: "missing orderId" }, { status: 400 });
  }
  const storage = getStorage();
  const order = await storage.readOrder(orderId);
  if (!order) {
    return NextResponse.json({ error: "order not found" }, { status: 404 });
  }
  try {
    const body = (await req.json()) as {
      stage?: string;
      issue?: string;
      shipmentStatus?: string;
      tracking?: { url?: string; number?: string };
    };
    if (body.stage) {
      order.prodigi = {
        ...order.prodigi,
        outcome: body.stage,
      };
      if (body.stage.toLowerCase() === "complete") order.status = "submitted";
    }
    order.updatedAt = new Date().toISOString();
    await storage.writeOrder(order);
  } catch {
    // We accept malformed callbacks silently — they're informational.
  }
  return NextResponse.json({ received: true });
}

export async function GET() {
  return NextResponse.json({
    endpoint: "prodigi-callback",
    method: "POST",
    accepts: "any JSON with stage/issue/shipment tracking fields",
  });
}
