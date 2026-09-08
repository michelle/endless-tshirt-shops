import { NextRequest, NextResponse } from "next/server";
import { getStripe, stripeConfigured } from "@/lib/stripeServer";
import { parseMetadata } from "@/lib/orderData";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Payments not configured" }, { status: 503 });
  }
  const { id } = await params;
  const stripe = getStripe();

  try {
    const intent = await stripe.paymentIntents.retrieve(id);
    const order = parseMetadata(intent.metadata);
    return NextResponse.json({
      paymentStatus: intent.status,
      fulfillmentStatus: order?.fulfillmentStatus ?? "pending",
      prodigiOrderId: order?.prodigiOrderId ?? "",
      fulfillmentError: order?.fulfillmentError ?? "",
      style: order?.style,
      color: order?.color,
      size: order?.size,
      locationLabel: order?.skyLocation,
      totalCents: order?.totalCents,
    });
  } catch {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
}
