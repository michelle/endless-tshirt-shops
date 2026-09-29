// GET /api/order/status?session_id=cs_...
// Verifies payment with Stripe and (idempotently) submits the order to
// Prodigi once paid. This is the success-redirect fulfilment path; the
// Stripe webhook performs the same fulfilment server-to-server.
import { retrieveCheckoutSession } from '../../../../lib/stripe';
import { fulfillSession } from '../../../../lib/fulfill';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function baseUrlFrom(request) {
  const proto = request.headers.get('x-forwarded-proto') || 'http';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  return `${proto}://${host}`;
}

export async function GET(request) {
  const sessionId = new URL(request.url).searchParams.get('session_id') || '';
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
    return Response.json({ error: 'invalid session id' }, { status: 400 });
  }
  let session;
  try {
    session = await retrieveCheckoutSession(sessionId);
  } catch (e) {
    return Response.json({ error: `Stripe: ${e.message}` }, { status: 502 });
  }

  const out = {
    paid: session.payment_status === 'paid',
    status: session.status,
    email: session.customer_email || session.metadata?.email || null,
    amountTotal: session.amount_total,
    currency: session.currency,
    design: session.metadata
      ? {
          line1: session.metadata.line1,
          place: session.metadata.place,
          when: session.metadata.when,
          color: session.metadata.color,
          size: session.metadata.size,
        }
      : null,
    shipTo: session.metadata
      ? [session.metadata.ship_name, session.metadata.ship_line1, session.metadata.ship_city,
         session.metadata.ship_state, session.metadata.ship_zip, session.metadata.ship_country]
          .filter(Boolean).join(', ')
      : null,
  };

  if (out.paid) {
    try {
      out.fulfillment = await fulfillSession(session, baseUrlFrom(request));
    } catch (e) {
      out.fulfillment = { fulfilled: false, error: e.message, detail: e.prodigi || undefined };
    }
  }
  return Response.json(out);
}
