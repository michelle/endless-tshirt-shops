import { NextResponse } from "next/server";

export async function POST(request: Request) {
  // Prodigi callbacks are operational hints only; Stripe metadata is our customer-facing record.
  const payload = (await request.json().catch(() => null)) as
    | { order?: { id?: string; status?: { stage?: string } }; event?: string }
    | null;
  console.info("Prodigi order callback", {
    event: payload?.event,
    orderId: payload?.order?.id,
    stage: payload?.order?.status?.stage,
  });
  return new NextResponse(null, { status: 204 });
}
