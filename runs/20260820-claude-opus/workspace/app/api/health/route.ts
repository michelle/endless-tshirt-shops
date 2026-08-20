/**
 * GET /api/health — readiness probe used to verify a deployment's wiring
 * without moving money. Reports which integrations are configured and whether
 * the print partner is currently answering.
 */

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, unknown> = {
    stripe_secret_key: Boolean(process.env.STRIPE_SECRET_KEY),
    stripe_publishable_key: Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
    stripe_webhook_secret: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    scalable_press_key: Boolean(process.env.SP_AUTH),
    dry_run_fulfillment: process.env.SP_DRY_RUN === 'true',
  };

  // Unauthenticated product read — confirms outbound network + partner uptime.
  try {
    const response = await fetch(
      'https://api.scalablepress.com/v2/products/bella-ladies-favorite-t-shirt',
      { signal: AbortSignal.timeout(5000) },
    );
    checks.scalable_press_reachable = response.ok;
  } catch {
    checks.scalable_press_reachable = false;
  }

  const ready =
    checks.stripe_secret_key && checks.stripe_publishable_key && checks.scalable_press_key;

  return NextResponse.json({ status: ready ? 'ok' : 'misconfigured', checks }, {
    status: ready ? 200 : 503,
  });
}
