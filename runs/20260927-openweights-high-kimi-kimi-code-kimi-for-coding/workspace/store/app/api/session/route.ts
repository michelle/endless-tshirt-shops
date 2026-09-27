import { NextRequest } from "next/server";
import { getStripe } from "@/lib/stripe";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id || !id.startsWith("cs_")) {
    return Response.json({ error: "Missing or invalid session id" }, { status: 400 });
  }
  const s = await getStripe().checkout.sessions.retrieve(id);
  if (!s.metadata || s.metadata.store !== "definingme-v1") {
    return Response.json({ error: "Unknown session" }, { status: 404 });
  }
  const anyS = s as any;
  const shippingName =
    anyS.shipping_details?.name ??
    anyS.collected_information?.shipping_details?.name ??
    s.customer_details?.name ??
    null;
  return Response.json({
    paymentStatus: s.payment_status,
    status: s.status,
    email: s.customer_details?.email ?? null,
    amountTotal: s.amount_total,
    currency: s.currency,
    shippingName,
    metadata: {
      word: s.metadata.word,
      pos: s.metadata.pos,
      definition: s.metadata.definition,
      example: s.metadata.example,
      year: s.metadata.year,
      size: s.metadata.size,
      colorLabel: s.metadata.colorLabel,
      accent: s.metadata.accent,
    },
  });
}

export const maxDuration = 15;
