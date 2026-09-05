import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Config smoke test — no secrets leave the building. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    stripe: Boolean(process.env.STRIPE_SECRET_KEY),
    stripePublishable: Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
    prodigi: Boolean(process.env.PRODIGI_API_KEY),
    prodigiEnv: (process.env.PRODIGI_API_URL ?? '').includes('sandbox')
      ? 'sandbox'
      : 'live',
    stripeWebhook: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
  });
}
