// JSON order status, keyed by Stripe checkout session id.
import { NextResponse } from 'next/server';
import { fulfillPaidSession, parseSessionDesign } from '@/lib/fulfillment';
import { getProdigiOrder } from '@/lib/prodigi';
import { stripe } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ref: string }> }
) {
  const { ref } = await params;
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(ref)) {
    return NextResponse.json({ error: 'unknown order reference' }, { status: 404 });
  }

  let session;
  try {
    session = await stripe().checkout.sessions.retrieve(ref);
  } catch {
    return NextResponse.json({ error: 'unknown order reference' }, { status: 404 });
  }

  const out: Record<string, unknown> = {
    reference: ref,
    paymentStatus: session.payment_status,
    status: session.status,
    amountTotal: session.amount_total,
    currency: session.currency,
    email: session.customer_details?.email ?? null,
    created: session.created ? new Date(session.created * 1000).toISOString() : null,
  };

  try {
    const { design, product } = parseSessionDesign(session);
    out.design = design;
    out.product = product;
  } catch {
    // metadata missing — nothing more to add
  }

  if (session.payment_status === 'paid') {
    // Reconciliation fallback: if the webhook has not run (e.g. no listener
    // configured yet), fulfil now. Idempotent.
    const result = await fulfillPaidSession(ref);
    out.fulfillment = result;
    const prodigiOrderId =
      result.status === 'error' || result.status === 'unpaid'
        ? session.metadata?.prodigiOrderId ?? null
        : result.prodigiOrderId;
    if (prodigiOrderId) {
      try {
        const prodigi = await getProdigiOrder(prodigiOrderId);
        out.prodigi = {
          id: prodigi.order.id,
          stage: prodigi.order.status.stage,
          details: prodigi.order.status.details,
          issues: prodigi.order.status.issues,
          shipments: prodigi.order.shipments,
        };
      } catch (e) {
        out.prodigi = { error: (e as Error).message };
      }
    }
  }

  return NextResponse.json(out);
}
