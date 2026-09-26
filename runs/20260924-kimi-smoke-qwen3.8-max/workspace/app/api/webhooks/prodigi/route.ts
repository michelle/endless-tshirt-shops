import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 15;

/**
 * POST /api/webhooks/prodigi
 *
 * Prodigi order-lifecycle callbacks land here. Without a database in this
 * sandbox build we log them structurally (visible in Vercel logs) and ack.
 * Production: persist these to the orders table to power tracking emails.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = await req.text().catch(() => null);
  }
  const evt = body as { eventType?: string; order?: { id?: string; merchantReference?: string; status?: unknown } };
  console.log(
    JSON.stringify({
      event: 'prodigi-callback',
      type: evt?.eventType ?? 'unknown',
      prodigiOrderId: evt?.order?.id,
      merchantReference: evt?.order?.merchantReference,
      stage: (evt?.order?.status as { stage?: string } | undefined)?.stage,
    }),
  );
  return NextResponse.json({ ok: true });
}
