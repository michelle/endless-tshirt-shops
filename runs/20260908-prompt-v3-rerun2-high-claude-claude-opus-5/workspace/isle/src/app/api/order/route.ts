import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { getOrder } from '@/lib/prodigi';
import { fulfilSession } from '@/lib/fulfil';
import { siteUrl, specFromMetadata } from '@/lib/spec';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const STAGE_COPY: Record<string, string> = {
  InProgress: 'At the press',
  Complete: 'Shipped',
  Cancelled: 'Cancelled',
};

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get('session_id') || '';
  if (!/^cs_[A-Za-z0-9_]+$/.test(id)) {
    return NextResponse.json({ error: 'Unknown order.' }, { status: 400 });
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(id, { expand: ['payment_intent'] });
  } catch {
    return NextResponse.json({ error: 'Unknown order.' }, { status: 404 });
  }

  const paid = session.payment_status === 'paid';
  const pi = session.payment_intent as Stripe.PaymentIntent | null;
  let prodigiOrderId = pi?.metadata?.prodigi_order_id || null;

  // Safety net: if the webhook has not landed yet (or was never wired up), the
  // buyer's own visit to this page places the order. Both paths are idempotent.
  if (paid && !prodigiOrderId) {
    try {
      const result = await fulfilSession(id, siteUrl(req), 90_000);
      prodigiOrderId = result.prodigiOrderId ?? null;
    } catch (err: any) {
      console.error('order: fulfilment retry failed', id, err?.message);
    }
  }

  let production: { stage: string; label: string; tracking?: { number?: string; url?: string; carrier?: string } } | null = null;
  if (prodigiOrderId) {
    try {
      const order = await getOrder(prodigiOrderId);
      const stage = order.status?.stage || 'InProgress';
      const shipment = order.shipments?.[0];
      production = {
        stage,
        label: STAGE_COPY[stage] || stage,
        tracking: shipment?.tracking
          ? {
              number: shipment.tracking.number,
              url: shipment.tracking.url,
              carrier: shipment.carrier?.name,
            }
          : undefined,
      };
    } catch (err: any) {
      console.error('order: prodigi lookup failed', prodigiOrderId, err?.message);
    }
  }

  return NextResponse.json({
    paid,
    email: session.customer_details?.email ?? null,
    amountTotal: session.amount_total,
    currency: session.currency,
    quantity: Number(session.metadata?.quantity) || 1,
    spec: specFromMetadata(session.metadata),
    prodigiOrderId,
    prodigiError: pi?.metadata?.prodigi_error || null,
    production,
  });
}
