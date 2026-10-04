import { baseUrl, json } from '../lib/config.js';
import { reconcile } from '../lib/reconcile.js';

// Called by Vercel Cron (see vercel.json), which sends `Authorization: Bearer $CRON_SECRET`.
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) return json({ error: 'unauthorized' }, 401);
  return json({ fulfilled: await reconcile(baseUrl(request)) });
}
