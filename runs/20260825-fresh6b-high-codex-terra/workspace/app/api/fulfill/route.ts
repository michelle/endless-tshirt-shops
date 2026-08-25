import { NextResponse } from 'next/server';
import { stripeClient, submitProdigiOrder } from '../lib';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const {sessionId} = await request.json();
    if (typeof sessionId !== 'string' || !sessionId.startsWith('cs_')) return NextResponse.json({error: 'Invalid checkout session.'}, {status: 400});
    const stripe = stripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const existing = session.metadata?.prodigiOrderId;
    if (existing) return NextResponse.json({alreadyFulfilled: true, prodigiOrderId: existing});
    const result = await submitProdigiOrder(session);
    const id = result.order?.id || result.order?.id?.toString() || 'accepted';
    await stripe.checkout.sessions.update(session.id, {metadata: {...session.metadata, prodigiOrderId: String(id)}});
    return NextResponse.json({prodigiOrderId: id});
  } catch (error) { console.error('fulfillment', error); return NextResponse.json({error: error instanceof Error ? error.message : 'Fulfillment could not be started.'}, {status: 500}); }
}
