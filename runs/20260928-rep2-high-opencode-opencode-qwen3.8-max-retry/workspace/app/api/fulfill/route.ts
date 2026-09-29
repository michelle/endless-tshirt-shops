import { NextResponse } from 'next/server';
import { fulfillSession, isSessionId } from '../../../lib/fulfill';
import { baseUrlFromRequest } from '../../../lib/url';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/fulfill {session_id}
 * Payment-gated fulfilment trigger. The success page calls this server-side
 * on load; the retry button calls it from the client. Safe to call repeatedly:
 * Stripe metadata + Prodigi's idempotencyKey deduplicate.
 */
export async function POST(req: Request): Promise<Response> {
  let body: { session_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  if (!isSessionId(body.session_id)) {
    return NextResponse.json({ error: 'invalid session_id' }, { status: 400 });
  }
  const base = baseUrlFromRequest(req);
  try {
    const result = await fulfillSession(body.session_id, base);
    const status = result.state === 'failed' ? 502 : 200;
    return NextResponse.json(result, { status });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'fulfilment failed';
    return NextResponse.json({ state: 'failed', error: message }, { status: 502 });
  }
}
