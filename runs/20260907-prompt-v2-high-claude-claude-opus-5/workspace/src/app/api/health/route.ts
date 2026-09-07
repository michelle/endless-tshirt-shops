import { NextResponse } from 'next/server';
import { siteOrigin } from '@/lib/stripe';
import { PRODIGI_BASE } from '@/lib/prodigi';
import { DESIGNS } from '@/lib/catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return NextResponse.json({
    ok: true,
    origin: siteOrigin(req),
    designs: DESIGNS.length,
    stripe: { configured: Boolean(process.env.STRIPE_SECRET_KEY), mode: process.env.STRIPE_SECRET_KEY?.includes('_test_') ? 'test' : 'live' },
    prodigi: { configured: Boolean(process.env.PRODIGI_API_KEY), base: PRODIGI_BASE },
    webhook: { configured: Boolean(process.env.STRIPE_WEBHOOK_SECRET) },
    reconcile: { configured: Boolean(process.env.CRON_SECRET) },
  });
}
