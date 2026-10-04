/**
 * /api/order-status/[orderId] - Returns the current state of an order.
 * Used by the success page to poll for Prodigi's confirmation.
 */
import { NextResponse } from 'next/server';
import { getOrder } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { orderId: string } }) {
  const order = await getOrder(params.orderId);
  if (!order) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  // We only return a sanitized subset; design + recipient are private.
  return NextResponse.json({
    orderId: order.id,
    status: order.status,
    prodigiOrderId: order.prodigiOrderId,
    stripeSessionId: order.stripeSessionId,
    error: order.error,
    createdAt: order.createdAt,
    productSku: order.productSku,
    color: order.color,
    size: order.size,
    copies: order.copies,
    unitPriceUsd: order.unitPriceUsd,
  });
}
