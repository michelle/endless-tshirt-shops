import { NextRequest, NextResponse } from 'next/server';
import { orders } from '@/lib/orders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, ctx: { params: { orderId: string } }) {
  const o = orders.get(ctx.params.orderId);
  if (!o) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(o);
}
