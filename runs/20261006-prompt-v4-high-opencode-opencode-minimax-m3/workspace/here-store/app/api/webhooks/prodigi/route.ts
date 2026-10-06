import { NextRequest, NextResponse } from 'next/server';
import { orders } from '@/lib/orders';
import { getOrder as getProdigiOrder } from '@/lib/prodigi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Prodigi CloudEvent callback. We re-fetch the latest order state from
 * Prodigi and update our local order record. This acts as a backup in
 * case the in-process state was lost (e.g. cold start).
 */
export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }); }
  // CloudEvents v1.0: data is the full order object
  const data = body?.data ?? body;
  const prodigiOrderId = data?.order?.id ?? data?.id ?? data?.orderId;
  const subjectOrderId = body?.subject;
  const internalOrderId = data?.metadata?.internalOrderId;

  if (!prodigiOrderId && !internalOrderId) {
    return NextResponse.json({ ignored: 'no identifiers' }, { status: 200 });
  }

  if (prodigiOrderId) {
    try {
      const fresh = await getProdigiOrder(prodigiOrderId);
      const stage = fresh?.order?.status?.stage;
      if (internalOrderId && stage === 'Complete') {
        orders.update(internalOrderId, { status: 'fulfilled' });
      }
    } catch (e: any) {
      console.warn('[prodigi-webhook] re-fetch failed', e?.message ?? e);
    }
  } else if (subjectOrderId) {
    // Locally generated id fallback
    if ((body?.type ?? '').includes('Complete')) {
      orders.update(subjectOrderId, { status: 'fulfilled' });
    }
  }

  return NextResponse.json({ ok: true });
}
