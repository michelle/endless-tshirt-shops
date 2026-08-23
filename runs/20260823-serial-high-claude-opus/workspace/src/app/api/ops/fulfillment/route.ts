import { NextResponse } from 'next/server';

import { fulfill } from '@/lib/fulfillment';
import { toOrderRecord, type OrderRecord } from '@/lib/orders';
import { stripe } from '@/lib/stripe';

/**
 * Operator endpoint for the orders that need attention: paid, but not yet with
 * the printer. `GET` reports them, `POST` retries them.
 *
 * Authenticated with a shared secret in `x-ops-token` (or `?token=` so Vercel
 * Cron can call it). Without `OPS_TOKEN` set, the route is disabled entirely
 * rather than open.
 */

export const runtime = 'nodejs';
export const maxDuration = 300;

const LOOKBACK_DAYS = 30;
const MAX_RETRIES_PER_RUN = 20;

function authorize(request: Request): NextResponse | null {
  const expected = process.env.OPS_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: 'Ops endpoint is disabled: set OPS_TOKEN to enable it.' },
      { status: 404 },
    );
  }
  const url = new URL(request.url);
  const provided =
    request.headers.get('x-ops-token') ??
    url.searchParams.get('token') ??
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
    '';

  // Constant-time-ish: compare full strings of equal length.
  const ok = provided.length === expected.length && provided === expected;
  return ok ? null : NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

/** Paid orders that the printer has not accepted yet. */
async function findPending(): Promise<OrderRecord[]> {
  const created = { gte: Math.floor(Date.now() / 1000) - LOOKBACK_DAYS * 86_400 };
  const pending: OrderRecord[] = [];

  for await (const pi of stripe().paymentIntents.list({ created, limit: 100 })) {
    if (pi.status !== 'succeeded') continue;
    const record = toOrderRecord(pi);
    if (record.spOrderId) continue;
    pending.push(record);
    if (pending.length >= 200) break;
  }
  return pending;
}

function summarize(record: OrderRecord) {
  return {
    paymentIntentId: record.paymentIntentId,
    state: record.state,
    attempts: record.attempts,
    amountCents: record.amountCents,
    timestampMs: record.timestampMs,
    style: record.style,
    size: record.size,
    designId: record.designId,
    orderToken: record.orderToken,
    spOrderId: record.spOrderId,
    error: record.error,
  };
}

async function runRetries() {
  // Skip anything mid-flight so a cron run can't race a browser or a webhook.
  const pending = (await findPending()).filter((r) => r.state !== 'placing');
  const results: Array<{ paymentIntentId: string; outcome: string; reason?: string }> = [];

  for (const record of pending.slice(0, MAX_RETRIES_PER_RUN)) {
    const outcome = await fulfill(record.paymentIntentId);
    results.push({
      paymentIntentId: record.paymentIntentId,
      outcome: outcome.status,
      reason: 'reason' in outcome ? outcome.reason : undefined,
    });
  }

  return {
    considered: pending.length,
    retried: results.length,
    skipped: Math.max(0, pending.length - results.length),
    results,
  };
}

/**
 * Reports the backlog, or works it when called with `?retry=1`.
 *
 * The retry-on-GET is for Vercel Cron, which only ever issues GET requests. It
 * is safe to call repeatedly: `fulfill` is idempotent, so a duplicate run
 * reports `already_placed` rather than ordering a second shirt.
 */
export async function GET(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;

  if (new URL(request.url).searchParams.get('retry') === '1') {
    return NextResponse.json(await runRetries());
  }

  const pending = await findPending();
  return NextResponse.json({
    pendingCount: pending.length,
    pending: pending.map(summarize),
  });
}

export async function POST(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;
  return NextResponse.json(await runRetries());
}
