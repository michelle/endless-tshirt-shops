import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { fulfilSession, sessionSummary } from '@/lib/fulfill';
import { getOrder } from '@/lib/prodigi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Confirmation-page data. If the webhook has not landed yet this also nudges
 * fulfilment along, which keeps the flow working before a webhook endpoint is
 * registered. It refuses to do anything for a session that is not paid.
 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('session_id');
  if (!id || !id.startsWith('cs_')) {
    return NextResponse.json({ error: 'Unknown order.' }, { status: 400 });
  }

  try {
    let session = await stripe().checkout.sessions.retrieve(id);
    let summary = sessionSummary(session);

    if (summary.paid && !summary.prodigiOrderId) {
      await fulfilSession(id);
      session = await stripe().checkout.sessions.retrieve(id);
      summary = sessionSummary(session);
    }

    let production: { stage: string | null; tracking: string | null; carrier: string | null } | null = null;
    if (summary.prodigiOrderId) {
      try {
        const order = await getOrder(summary.prodigiOrderId);
        production = {
          stage: order.status?.stage ?? null,
          tracking: order.shipments?.[0]?.tracking?.url ?? null,
          carrier: order.shipments?.[0]?.carrier?.service ?? order.shipments?.[0]?.carrier?.name ?? null,
        };
      } catch (err) {
        console.error('prodigi status lookup failed', err);
      }
    }

    return NextResponse.json({ ...summary, production });
  } catch (err) {
    console.error('order lookup failed', err);
    return NextResponse.json({ error: 'Could not load that order.' }, { status: 404 });
  }
}
