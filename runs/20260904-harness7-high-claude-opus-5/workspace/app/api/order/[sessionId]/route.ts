import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { PRODIGI_ERROR_KEY, fulfilSession } from '@/lib/fulfill';
import { getOrder, summariseStage } from '@/lib/prodigi';
import { getBaseUrl } from '@/lib/urls';
import { parseSize, parseStyle, parseTimestamp } from '@/lib/catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Order status for the confirmation screen.
 *
 * Doubles as a fulfilment backstop: if the buyer lands here before the webhook
 * has been delivered (or the webhook was never configured), this places the
 * Prodigi order itself. `fulfilSession` is idempotent, so the two paths racing
 * is fine.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
    return NextResponse.json({ error: 'Unknown order.' }, { status: 400 });
  }

  let session;
  try {
    session = await stripe().checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent'],
    });
  } catch {
    return NextResponse.json({ error: 'Unknown order.' }, { status: 404 });
  }

  const ts = parseTimestamp(session.metadata?.timestamp);
  const style = parseStyle(session.metadata?.style);
  const size = parseSize(session.metadata?.size);

  const shirt = ts !== null && style && size ? { timestamp: ts, style, size } : null;

  if (session.payment_status !== 'paid') {
    return NextResponse.json({
      paid: false,
      status: session.status,
      shirt,
      fulfilment: { state: 'awaiting-payment' as const },
    });
  }

  const result = await fulfilSession(session, await getBaseUrl());

  const recordedError =
    typeof session.payment_intent === 'object' && session.payment_intent
      ? session.payment_intent.metadata?.[PRODIGI_ERROR_KEY] || null
      : null;

  if (result.state === 'fulfilled') {
    // Re-read from Prodigi so a returning buyer sees live production status
    // rather than whatever was true at the moment we placed the order.
    const order = result.order ?? (await getOrder(result.prodigiOrderId).then((r) => r.order).catch(() => null));
    return NextResponse.json({
      paid: true,
      email: session.customer_details?.email ?? null,
      shirt,
      fulfilment: {
        state: 'placed' as const,
        prodigiOrderId: result.prodigiOrderId,
        stage: order ? summariseStage(order) : 'Submitted',
        tracking: order?.shipments?.find((s) => s.tracking?.number)?.tracking ?? null,
      },
    });
  }

  return NextResponse.json({
    paid: true,
    email: session.customer_details?.email ?? null,
    shirt,
    fulfilment: {
      state: 'needs-attention' as const,
      // The buyer's money is captured either way, so say so plainly rather
      // than implying the purchase failed.
      message: result.state === 'failed' ? result.message : 'Payment is still settling.',
      recordedError,
    },
  });
}
