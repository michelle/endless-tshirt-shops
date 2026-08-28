import { NextResponse } from 'next/server';

import { PRICE_CENTS, formatUsd } from '@/lib/catalog';
import { isProdigiSandbox, quote } from '@/lib/prodigi';
import { siteOrigin } from '@/lib/site';
import { isStripeTestMode } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Config + live-margin check. Handy in CI and after a deploy: it proves the
 * Prodigi key actually works and tells you whether you are still selling above
 * cost.
 */
export async function GET() {
  const env = {
    STRIPE_SECRET_KEY: Boolean(process.env.STRIPE_SECRET_KEY),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
    STRIPE_WEBHOOK_SECRET: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    PRODIGI_API_KEY: Boolean(process.env.PRODIGI_API_KEY),
  };

  let prodigi: unknown = { ok: false, reason: 'PRODIGI_API_KEY missing' };
  if (env.PRODIGI_API_KEY) {
    try {
      const q = await quote('fitted', 'M', 'US');
      prodigi = q
        ? {
            ok: true,
            sandbox: isProdigiSandbox(),
            landedCost: formatUsd(q.totalCents),
            price: formatUsd(PRICE_CENTS),
            grossMargin: formatUsd(PRICE_CENTS - q.totalCents),
          }
        : { ok: false, reason: 'Quote returned no options' };
    } catch (err) {
      prodigi = { ok: false, reason: err instanceof Error ? err.message : 'quote failed' };
    }
  }

  const ready = env.STRIPE_SECRET_KEY && env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && env.PRODIGI_API_KEY;

  return NextResponse.json(
    {
      ok: ready,
      origin: await siteOrigin(),
      stripe: { configured: env.STRIPE_SECRET_KEY, testMode: isStripeTestMode(), webhookConfigured: env.STRIPE_WEBHOOK_SECRET },
      prodigi,
      env,
    },
    { status: ready ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
