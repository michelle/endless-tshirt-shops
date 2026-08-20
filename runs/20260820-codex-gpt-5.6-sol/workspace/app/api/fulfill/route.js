import { NextResponse } from 'next/server';
import { fulfillCheckout } from '@/lib/fulfillment';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request) {
  try {
    const { sessionId } = await request.json();
    if (!sessionId || !/^cs_(test_|live_)/.test(sessionId)) return NextResponse.json({ error: 'Invalid checkout session.' }, { status: 400 });
    return NextResponse.json(await fulfillCheckout(sessionId));
  } catch (error) {
    console.error('fulfillment_error', error);
    return NextResponse.json({ error: 'Your payment succeeded, but fulfillment needs attention. Please keep your confirmation email.' }, { status: 502 });
  }
}
