import { NextResponse } from "next/server";
import { saveOrderResult } from "@/lib/store";

export const runtime = "nodejs";

// Prodigi pushes order status changes here as CloudEvents
// (com.prodigi.order.status.stage.changed#<Stage>). We don't verify a
// signature here — Prodigi's sandbox callback docs don't specify a signing
// scheme — so treat this purely as a status-tracking convenience, not a
// source of truth for fulfillment decisions (see README "Gaps").
export async function POST(req) {
  let event;
  try {
    event = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const order = event?.data?.order || event?.data;
  const orderId = order?.merchantReference;
  if (!orderId) {
    return NextResponse.json({ received: true });
  }

  // orderRecordUrl isn't known here, but result documents are addressed by
  // orderId alone via saveOrderResult, so merge in the latest status.
  await saveOrderResult(orderId, {
    orderId,
    status: "print_status_update",
    prodigiOrderId: order?.id,
    prodigiStatus: order?.status,
    eventType: event?.type,
    updatedAt: new Date().toISOString(),
  });

  return NextResponse.json({ received: true });
}
