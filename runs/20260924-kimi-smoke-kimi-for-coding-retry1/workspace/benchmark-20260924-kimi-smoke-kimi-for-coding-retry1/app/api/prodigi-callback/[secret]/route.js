import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Prodigi order callbacks (CloudEvents). The path segment acts as a shared
// secret since Prodigi does not sign callbacks. We keep no order state, so
// this acknowledges and logs; the confirmation page polls order-status instead.
export async function POST(req, { params }) {
  const expected = process.env.PRODIGI_CALLBACK_SECRET;
  if (!expected || params.secret !== expected) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  let event = null;
  try {
    event = await req.json();
  } catch {
    /* ignore */
  }
  console.log('prodigi callback:', event?.type || event?.eventType, event?.subject || '');
  return NextResponse.json({ received: true });
}
