import { NextResponse } from 'next/server';
import { isTestMode } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Config smoke test: is this deployment wired up, and to which environments? */
export async function GET() {
  return NextResponse.json({
    ok: Boolean(process.env.STRIPE_SECRET_KEY && process.env.PRODIGI_API_KEY),
    stripe: {
      configured: Boolean(process.env.STRIPE_SECRET_KEY),
      mode: isTestMode() ? 'test' : 'live',
      webhookConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    },
    prodigi: {
      configured: Boolean(process.env.PRODIGI_API_KEY),
      env: process.env.PRODIGI_ENV === 'live' ? 'live' : 'sandbox',
    },
  });
}
