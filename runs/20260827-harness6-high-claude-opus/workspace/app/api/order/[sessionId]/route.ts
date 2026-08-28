import { NextResponse } from 'next/server';

import { fulfillSession, type FulfillmentState } from '@/lib/fulfill';
import { siteOrigin } from '@/lib/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function serialize(result: Exclude<FulfillmentState, { state: 'unknown' }>) {
  const body: Record<string, unknown> = { state: result.state, session: result.session };
  if (result.state === 'placed') {
    body.order = {
      id: result.order.id,
      // Prodigi's create response occasionally omits the stage; the order still
      // exists, so say so rather than showing the customer "Unknown".
      stage: result.order.status?.stage ?? 'Received',
      issues: result.order.status?.issues ?? [],
      shipments: (result.order.shipments ?? []).map((s) => ({
        carrier: s.carrier?.name ?? null,
        tracking: s.tracking?.number ?? null,
        trackingUrl: s.tracking?.url ?? null,
        dispatchDate: s.dispatchDate ?? null,
      })),
    };
  }
  if (result.state === 'failed') body.error = result.error;
  return body;
}

async function handle(sessionId: string, create: boolean) {
  if (!sessionId.startsWith('cs_')) {
    return NextResponse.json({ error: 'Not an order id.' }, { status: 400 });
  }

  const origin = await siteOrigin();
  const result = await fulfillSession(sessionId, origin, { create });

  if (result.state === 'unknown') {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  }
  return NextResponse.json(serialize(result), { headers: { 'Cache-Control': 'no-store' } });
}

/** Read-only status. Never places an order, so it always answers fast. */
export async function GET(_req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  return handle((await params).sessionId, false);
}

/**
 * Places the Prodigi order if it isn't placed yet.
 *
 * Unauthenticated on purpose — knowing a session id is the customer's proof, and
 * the worst a stranger with a valid id can do is trigger the same idempotent
 * fulfilment the webhook would have done anyway.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  return handle((await params).sessionId, true);
}
