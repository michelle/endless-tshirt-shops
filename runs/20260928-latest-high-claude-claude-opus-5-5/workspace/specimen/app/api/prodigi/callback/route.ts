export const runtime = "nodejs";

// Prodigi posts order status updates here (set per order via callbackUrl).
// The order page always reads live status from Prodigi, so we only log; callbacks are unauthenticated.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const order = body?.order ?? body?.data?.order;
  console.log("[prodigi-callback]", JSON.stringify({ type: body?.type, id: order?.id, stage: order?.status?.stage }));
  return Response.json({ ok: true });
}
