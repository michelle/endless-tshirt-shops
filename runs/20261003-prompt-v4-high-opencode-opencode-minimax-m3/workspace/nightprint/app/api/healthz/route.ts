/**
 * /api/healthz - Reports configuration state.
 *   Useful while debugging deployment and confirming env vars are present.
 */
import { NextResponse } from 'next/server';
import { pingProdigi } from '@/lib/prodigi';
import { isStripeConfigured, stripeMode } from '@/lib/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  let prodigi: { status: number; ok: boolean } | { error: string } = { status: 0, ok: false };
  try {
    prodigi = await pingProdigi();
  } catch (err: any) {
    prodigi = { error: err?.message ?? 'unknown' };
  }

  return NextResponse.json({
    ok: true,
    time: new Date().toISOString(),
    prodigi: {
      configured: Boolean(process.env.PRODIGI_API_KEY),
      env: process.env.LIVE_PRODIGI === '1' ? 'live' : 'sandbox',
      ping: prodigi,
    },
    stripe: {
      configured: isStripeConfigured(),
      mode: stripeMode(),
      webhookSecretSet: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    },
    site: {
      publicBaseUrl: process.env.PUBLIC_BASE_URL ?? null,
    },
  });
}
