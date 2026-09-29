export const runtime = "nodejs";

// Prodigi posts CloudEvents here when an order changes stage or ships.
// We don't store state (Stripe + Prodigi are the systems of record); the order
// page fetches live status, so this endpoint just records the event in logs.
export async function POST(req: Request) {
  const event = await req.json().catch(() => null);
  const order = event?.data?.order;
  console.log("[prodigi callback]", event?.type, order?.id, order?.status?.stage, JSON.stringify(order?.shipments ?? []));
  return Response.json({ ok: true });
}
