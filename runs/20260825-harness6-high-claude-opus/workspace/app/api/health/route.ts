import { NextResponse } from 'next/server';

import { PRICE_CENTS, STYLES } from '@/lib/product';
import { isProdigiConfigured, prodigiEnv } from '@/lib/prodigi';
import { isPubliclyReachable, siteOrigin } from '@/lib/site';
import { isLiveMode, isStripeConfigured } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Config self-check. Reports whether things are wired up, never their values. */
export async function GET() {
  const origin = siteOrigin();
  const checks = {
    stripeSecretKey: isStripeConfigured(),
    stripePublishableKey: Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
    stripeWebhookSecret: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    prodigiApiKey: isProdigiConfigured(),
    artworkPubliclyReachable: isPubliclyReachable(origin),
  };

  return NextResponse.json(
    {
      ok: Object.values(checks).every(Boolean),
      mode: {
        stripe: isLiveMode() ? 'live' : 'test',
        prodigi: prodigiEnv(),
      },
      origin,
      priceCents: PRICE_CENTS,
      skus: Object.fromEntries(Object.entries(STYLES).map(([k, v]) => [k, v.sku])),
      checks,
      now: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
