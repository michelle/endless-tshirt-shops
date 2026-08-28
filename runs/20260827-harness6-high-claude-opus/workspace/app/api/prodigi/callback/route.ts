import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Prodigi status callbacks (asset download, production, dispatch).
 *
 * Prodigi does not sign these, so this endpoint only logs — it never mutates
 * order state. The order page reads authoritative status straight from the
 * Prodigi API instead. Wire this to email/analytics once you have somewhere to
 * put it.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('[prodigi:callback]', JSON.stringify(body).slice(0, 2000));
  } catch {
    console.log('[prodigi:callback] non-JSON payload');
  }
  return NextResponse.json({ received: true });
}
