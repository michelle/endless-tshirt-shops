/**
 * /api/demo-pay - Simulate a successful Stripe checkout when STRIPE_SECRET_KEY
 * is not configured. This lets the store demonstrate its full order pipeline
 * without requiring the operator to set up a Stripe account.
 *
 * In production, REMOVE this route and switch to a real Stripe session.
 *
 * The UI is redirected here from /api/order when no Stripe key is set.
 * After processing we redirect to /success?orderId=...
 */
import { NextResponse } from 'next/server';
import { getOrder, updateOrder } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const orderId = url.searchParams.get('orderId');
  if (!orderId) {
    return NextResponse.json({ error: 'missing orderId' }, { status: 400 });
  }
  return processDemoPayment(orderId, url);
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const orderId = url.searchParams.get('orderId');
  if (!orderId) {
    return NextResponse.json({ error: 'missing orderId' }, { status: 400 });
  }
  return processDemoPayment(orderId, url);
}

async function processDemoPayment(orderId: string, url: URL) {
  const baseUrl = `${url.protocol}//${url.host}`;
  const order = await getOrder(orderId);
  if (!order) {
    return NextResponse.json({ error: 'order not found' }, { status: 404 });
  }

  await updateOrder(orderId, { status: 'paid' });

  // Run fulfillment synchronously so we know it actually completed
  // (Important: in dev mode, the in-process server continues after the response;
  //  in production, the Stripe webhook handler does this synchronously.)
  try {
    await runFulfillment(orderId);
  } catch (err: any) {
    await updateOrder(orderId, { status: 'failed', error: err?.message ?? 'unknown' });
    console.error('[demo-pay] prodigi submit failed', err);
  }

  return NextResponse.redirect(`${baseUrl}/success?orderId=${orderId}&demo=1`, { status: 303 });
}

async function runFulfillment(orderId: string) {
  const { submitOrderToProdigi } = await import('@/lib/fulfill');
  await submitOrderToProdigi(orderId);
  await updateOrder(orderId, { status: 'submitted_to_prodigi' });
}
