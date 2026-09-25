import { NextResponse } from 'next/server';
import { listOrdersByReference } from '@/lib/prodigi';

export const runtime = 'nodejs';
export const maxDuration = 60;

// GET /api/order-status?ref=sw-xxx
// Looks up the Prodigi order(s) for a merchant reference so the confirmation
// page can show live fulfillment status without any database.
export async function GET(req) {
  const ref = new URL(req.url).searchParams.get('ref') || '';
  if (!/^sw-[a-f0-9]{6,32}$/.test(ref)) {
    return NextResponse.json({ error: 'bad ref' }, { status: 400 });
  }
  try {
    const data = await listOrdersByReference(ref);
    const orders = (data.orders || []).map((o) => ({
      id: o.id,
      stage: o.status?.stage,
      issues: o.status?.issues || [],
      details: o.status?.details || {},
      shipments: (o.shipments || []).map((sh) => ({
        carrier: sh.carrier?.name,
        service: sh.carrier?.service,
        tracking: sh.tracking?.number || null,
        url: sh.tracking?.url || null,
      })),
      created: o.created,
    }));
    return NextResponse.json({ ref, orders });
  } catch (e) {
    console.error('order status lookup failed', e);
    return NextResponse.json({ error: 'lookup failed' }, { status: 502 });
  }
}
