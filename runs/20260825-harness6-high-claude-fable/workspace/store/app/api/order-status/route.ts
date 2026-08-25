import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { ensureFulfilled } from '@/lib/fulfill';

// The webhook normally creates the Prodigi order within seconds of payment.
// As a safety net, if the customer is sitting on the success page and the
// session is paid-but-unfulfilled after this grace period (e.g. webhook
// misconfigured or delivery failed), fulfill it from here instead.
const WEBHOOK_GRACE_SECONDS = 45;

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id');
  if (!sessionId || !/^cs_[a-zA-Z0-9_]+$/.test(sessionId)) {
    return NextResponse.json({ error: 'Invalid session_id' }, { status: 400 });
  }

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    const ageSeconds = Math.floor(Date.now() / 1000) - session.created;
    const allowCreate =
      session.payment_status === 'paid' && ageSeconds > WEBHOOK_GRACE_SECONDS;

    const state = await ensureFulfilled(sessionId, { allowCreate });
    return NextResponse.json(state);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
