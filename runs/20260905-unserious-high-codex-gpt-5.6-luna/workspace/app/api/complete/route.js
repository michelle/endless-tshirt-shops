import { NextResponse } from 'next/server';
import { getStripe } from '../../../lib/stripe';
import { fulfillCheckoutSession } from '../../../lib/fulfillment';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const { sessionId } = await request.json();
    if (!sessionId || !sessionId.startsWith('cs_')) return NextResponse.json({ error: 'Missing session' }, { status: 400 });
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') return NextResponse.json({ error: 'Payment is not complete yet' }, { status: 409 });
    const result = await fulfillCheckoutSession(session);
    return NextResponse.json(result);
  } catch (error) {
    console.error('fulfillment completion error', error);
    return NextResponse.json({ error: 'Your payment went through, but the shirt robot needs a human moment. Email hello@datetime.store.' }, { status: 500 });
  }
}
