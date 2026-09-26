import { NextRequest, NextResponse } from 'next/server';
import { buildOrder, paymentMode } from '@/lib/orders';

export const runtime = 'nodejs';
export const maxDuration = 15;

/**
 * POST /api/orders
 * { design, product: { color, size, qty }, shipping: {...} }
 *
 * Validates everything, prices the order, and returns an HMAC-signed
 * order token. Nothing is charged and nothing is sent to Prodigi here —
 * the token is the input to the payment step.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const o = body as { design?: unknown; product?: unknown; shipping?: unknown };
  const { order, token, error } = buildOrder({
    design: o.design,
    product: (o.product ?? {}) as never,
    shipping: o.shipping,
  });
  if (error || !order || !token) {
    return NextResponse.json({ error: error ?? 'Invalid order.' }, { status: 400 });
  }
  return NextResponse.json({
    orderId: order.orderId,
    token,
    pricing: order.pricing,
    paymentMode: paymentMode(),
  });
}
