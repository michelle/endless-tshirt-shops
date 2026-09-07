import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

// Polled by the confirmation page after a successful payment while we wait
// for the `payment_intent.succeeded` webhook to place the Prodigi order.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id?.startsWith("pi_")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let pi;
  try {
    pi = await stripe.paymentIntents.retrieve(id);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const m = pi.metadata ?? {};

  return NextResponse.json({
    paymentStatus: pi.status,
    style: m.style ?? null,
    size: m.size ?? null,
    timestamp: m.timestamp ?? null,
    email: pi.receipt_email ?? null,
    shippingName: pi.shipping?.name ?? null,
    prodigiOrderId: m.prodigiOrderId ?? null,
    prodigiStage: m.prodigiStage ?? null,
    prodigiError: m.prodigiError ?? null,
  });
}
