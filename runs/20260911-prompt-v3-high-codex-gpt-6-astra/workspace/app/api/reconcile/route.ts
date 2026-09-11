import { APP, fulfill, json, stripe } from '@/lib/server';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function GET(req: Request) {
  if (
    !process.env.CRON_SECRET ||
    req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`
  )
    return json({ error: 'Unauthorized' }, 401);
  try {
    const client = stripe(),
      sessions = await client.checkout.sessions.list({
        created: { gte: Math.floor(Date.now() / 1000) - 7 * 86400 },
        limit: 100,
      });
    const results = [];
    for (const s of sessions.data) {
      if (
        s.metadata?.app === APP &&
        s.payment_status === 'paid' &&
        !s.metadata.prodigiOrderId
      ) {
        try {
          results.push({ sessionId: s.id, ...(await fulfill(s.id, client)) });
        } catch {
          results.push({ id: s.id, retry: true });
        }
      }
    }
    return json({ results, more: sessions.has_more });
  } catch {
    return json({ error: 'Reconciliation failed.' }, 500);
  }
}
