// Order status lookup by merchant reference (used by the confirmation page
// to show live Prodigi fulfilment progress).

import { NextResponse } from 'next/server';
import { findProdigiOrders } from '@/lib/prodigi';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ref: string }> }
) {
  const { ref } = await params;
  if (!/^NL-[A-Z0-9]{4,12}$/.test(ref)) {
    return NextResponse.json({ error: 'Bad reference.' }, { status: 400 });
  }
  try {
    const res = await findProdigiOrders(ref);
    const orders = (res.orders ?? (res.order ? [res.order] : [])).map((o) => ({
      id: o?.id ?? null,
      stage: o?.status?.stage ?? null,
      details: o?.status?.details ?? null,
      issues: o?.status?.issues ?? [],
      shipments: (o?.shipments ?? []).map((s) => ({
        status: s?.status ?? null,
        carrier: s?.carrier?.name ?? null,
        trackingUrl: s?.tracking?.url ?? null,
        trackingNumber: s?.tracking?.number ?? null,
      })),
    }));
    return NextResponse.json({ found: orders.length > 0, orders });
  } catch (err) {
    console.error('[nightloom] status lookup failed', err);
    return NextResponse.json({ error: 'Status lookup failed.' }, { status: 502 });
  }
}
