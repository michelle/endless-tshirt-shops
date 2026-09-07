import { NextResponse } from 'next/server';
import { siteOrigin, stripe } from '@/lib/stripe';
import { fulfilSession } from '@/lib/fulfil';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * Safety net for the no-database design: walk recent paid Checkout Sessions and place any
 * Prodigi order that is still missing. Idempotent, so it is safe to run on a schedule
 * (see `vercel.json`) or by hand after an incident.
 *
 * Auth: `Authorization: Bearer $CRON_SECRET` (what Vercel Cron sends) or `?key=$CRON_SECRET`.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET is not configured.' }, { status: 503 });

  const url = new URL(req.url);
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (bearer !== secret && url.searchParams.get('key') !== secret) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const lookbackHours = Number(url.searchParams.get('hours') ?? 48);
  const since = Math.floor(Date.now() / 1000) - lookbackHours * 3600;

  const sessions = await stripe().checkout.sessions.list({ limit: 100, created: { gte: since } });
  const origin = siteOrigin(req);
  const report: { id: string; state: string; order?: string; error?: string }[] = [];

  for (const s of sessions.data) {
    if (s.payment_status !== 'paid') continue;
    if (s.metadata?.store !== 'last-shift') continue;
    const result = await fulfilSession(s.id, origin);
    report.push({
      id: s.id,
      state: result.state,
      order: 'order' in result ? result.order.id : undefined,
      error: result.state === 'error' ? result.error : undefined,
    });
  }

  return NextResponse.json({
    ok: true,
    scanned: sessions.data.length,
    considered: report.length,
    placed: report.filter((r) => r.state === 'placed').length,
    failed: report.filter((r) => r.state === 'error').length,
    report,
  });
}
