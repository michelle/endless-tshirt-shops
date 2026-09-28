import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getProdigiOrder } from "@/lib/prodigi";
import { GARMENT_COLORS } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sessionId = new URL(req.url).searchParams.get("session_id");
  if (!sessionId) return NextResponse.json({ error: "session_id required" }, { status: 400 });

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const md = session.metadata || {};
    const prodigiOrderId = md.prodigiOrderId || null;

    let prodigi: unknown = null;
    if (prodigiOrderId) {
      const full = await getProdigiOrder(prodigiOrderId);
      if (full?.order) {
        prodigi = {
          id: full.order.id,
          stage: full.order.status?.stage,
          issues: full.order.status?.issues ?? [],
          thumbnailUrl: full.order.items?.find((i) => i.thumbnailUrl)?.thumbnailUrl ?? null,
          shipments: (full.order.shipments ?? []).map((s) => ({
            id: s.id,
            status: s.status,
            carrier: s.carrier?.name,
            service: s.carrier?.service,
            trackingNumber: s.tracking?.number,
            trackingUrl: s.tracking?.url,
            dispatchDate: s.dispatchDate,
          })),
        };
      }
    }

    const garment = GARMENT_COLORS.find((c) => c.prodigi === md.color);
    return NextResponse.json({
      paid: session.payment_status === "paid",
      paymentStatus: session.payment_status,
      email: session.customer_details?.email ?? null,
      design: md.d
        ? {
            color: garment?.label ?? md.color,
            size: (md.size || "").toUpperCase(),
            style: md.style,
            ink: md.ink,
          }
        : null,
      prodigiOrderId,
      prodigi,
    });
  } catch (err) {
    console.error("order-status error", err);
    return NextResponse.json({ error: "order not found" }, { status: 404 });
  }
}
