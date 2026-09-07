import { NextResponse } from 'next/server';
import { fontStatus } from '@/lib/artwork';
import { optionalEnv, siteOrigin } from '@/lib/env';
import { prodigiEnvironment } from '@/lib/prodigi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Configuration self-check. Reports presence, never values. */
export async function GET(request: Request) {
  return NextResponse.json({
    ok: true,
    origin: siteOrigin(request.url),
    stripe: {
      secretKey: Boolean(optionalEnv('STRIPE_SECRET_KEY')),
      publishableKey: Boolean(optionalEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY')),
      webhookSecret: Boolean(optionalEnv('STRIPE_WEBHOOK_SECRET')),
      mode: optionalEnv('STRIPE_SECRET_KEY')?.includes('_test_') ? 'test' : 'live',
    },
    prodigi: {
      apiKey: Boolean(optionalEnv('PRODIGI_API_KEY')),
      environment: prodigiEnvironment(),
    },
    artworkFont: fontStatus(),
    commit: optionalEnv('VERCEL_GIT_COMMIT_SHA')?.slice(0, 7) ?? null,
  });
}
