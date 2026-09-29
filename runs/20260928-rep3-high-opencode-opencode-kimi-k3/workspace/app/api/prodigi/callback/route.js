// POST /api/prodigi/callback — Prodigi order status callbacks.
// Stateless store: nothing to persist, so we accept and acknowledge.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  const body = await request.json().catch(() => null);
  console.log('prodigi callback', JSON.stringify({
    id: body?.order?.id,
    merchantReference: body?.order?.merchantReference,
    stage: body?.order?.status?.stage,
  }));
  return Response.json({ received: true });
}
