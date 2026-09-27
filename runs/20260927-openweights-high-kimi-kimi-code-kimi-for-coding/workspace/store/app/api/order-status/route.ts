import { NextRequest } from "next/server";
import { findOrderByMerchantReference } from "@/lib/prodigi";

export async function GET(request: NextRequest) {
  const ref = request.nextUrl.searchParams.get("ref");
  if (!ref || !ref.startsWith("cs_")) {
    return Response.json({ error: "Missing or invalid order reference" }, { status: 400 });
  }
  const order = await findOrderByMerchantReference(ref);
  if (!order) {
    return Response.json({ found: false });
  }
  return Response.json({
    found: true,
    prodigiId: order.id,
    stage: order.status?.stage ?? null,
    details: order.status?.details ?? null,
    issues: order.status?.issues ?? [],
    shipments: (order.shipments ?? []).map((sh: any) => ({
      carrier: sh.carrier?.name ?? null,
      service: sh.carrier?.service ?? null,
      tracking: sh.tracking ?? null,
      status: sh.status ?? null,
    })),
    created: order.created ?? null,
    lastUpdated: order.lastUpdated ?? null,
    shippingMethod: order.shippingMethod ?? null,
  });
}

export const maxDuration = 15;
