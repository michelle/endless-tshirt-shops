import { NextResponse } from 'next/server';
import { fulfillCheckout } from '@/lib/fulfill';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get('session_id') || '';
  if (!/^cs_(test_|live_)?[A-Za-z0-9_]+$/.test(sessionId)) {
    return NextResponse.json({ status: 'error', message: 'That receipt has escaped.' }, { status: 400 });
  }
  try {
    const result = await fulfillCheckout(sessionId);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { status: 'error', message: 'Payment landed, but the shirt printer needs a human nudge.' },
      { status: 502 },
    );
  }
}
