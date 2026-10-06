// app/api/order-status/[id]/route.ts
// Polled by /success. Returns the latest persisted status + Prodigi
// outcome, so a customer can watch their order progress from paid →
// submitted.

import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/services";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const storage = getStorage();
  const order = await storage.readOrder(params.id);
  if (!order) {
    return NextResponse.json({ error: "order not found" }, { status: 404 });
  }
  return NextResponse.json({
    id: order.id,
    status: order.status,
    prodigiOrderId: order.prodigi?.orderId,
    prodigiOutcome: order.prodigi?.outcome,
    error: order.prodigi?.error,
    updatedAt: order.updatedAt,
    recipient: order.recipient,
    design: {
      headline: order.design.headline,
      placeName: order.design.placeName,
      dateIso: order.design.dateIso,
      garmentColor: order.design.garmentColor,
      garmentSize: order.design.garmentSize,
    },
  });
}
