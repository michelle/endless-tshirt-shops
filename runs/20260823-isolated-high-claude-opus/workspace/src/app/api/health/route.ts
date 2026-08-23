import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Configuration check. Reports which credentials are present and which mode
 * they are in, without ever echoing a secret. Handy immediately after a deploy.
 */
export async function GET() {
  const secretKey = process.env.STRIPE_SECRET_KEY ?? '';
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

  const checks = {
    stripe_secret_key: describeStripeKey(secretKey),
    stripe_publishable_key: describeStripeKey(publishableKey),
    stripe_webhook_secret: process.env.STRIPE_WEBHOOK_SECRET ? 'set' : 'MISSING',
    scalable_press_key: process.env.SP_AUTH ? 'set' : 'MISSING',
  };

  const ok = !Object.values(checks).includes('MISSING');
  return NextResponse.json({ ok, checks }, { status: ok ? 200 : 503 });
}

function describeStripeKey(key: string): string {
  if (!key) return 'MISSING';
  if (key.includes('_test_')) return 'set (test mode)';
  if (key.includes('_live_')) return 'set (LIVE MODE)';
  return 'set';
}
