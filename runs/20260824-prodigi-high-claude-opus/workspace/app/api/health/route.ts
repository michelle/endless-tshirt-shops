import { configStatus, baseUrl } from '@/lib/env';
import { getProduct, quote } from '@/lib/prodigi';
import { stripe } from '@/lib/stripe';
import { artworkUrl } from '@/lib/artwork';
import { PRICE_CENTS, STYLES, formatUsd } from '@/lib/catalog';

/**
 * Deployment self-check. Confirms both upstreams answer and reports the unit
 * economics, which is the thing most likely to be quietly wrong: Prodigi's
 * price plus shipping has to stay under what we charge.
 *
 * `GET /api/health` is cheap; `GET /api/health?deep=1` talks to Stripe and
 * Prodigi.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const deep = new URL(request.url).searchParams.get('deep') === '1';
  const config = configStatus();

  if (!deep) {
    return Response.json({ ok: true, config });
  }

  const checks: Record<string, unknown> = {};
  let ok = true;

  try {
    // Cheap authenticated read that also proves the key can see PaymentIntents,
    // which is the only Stripe resource this app touches.
    const intents = await stripe().paymentIntents.list({ limit: 1 });
    checks.stripe = { ok: true, mode: config.stripe.mode, paymentIntentsVisible: intents.data.length };
  } catch (error) {
    ok = false;
    checks.stripe = { ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  // Reachability and pricing are reported separately on purpose. Prodigi's
  // /quotes endpoint goes down on its own from time to time, and when it does we
  // can still take orders — so a failed quote must not make the whole shop look
  // unhealthy. Only a failed catalog read means we genuinely cannot print.
  try {
    // Single attempt, bounded: a probe should report what is true right now, and
    // all four checks together have to finish inside the function's 30s.
    const product = await getProduct(STYLES.unisex.sku, { timeoutMs: 8_000, retries: 0 });
    checks.prodigi = { ok: true, environment: config.prodigi.environment, sku: product.sku };
  } catch (error) {
    ok = false;
    checks.prodigi = { ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  try {
    const result = await quote({
      destinationCountryCode: 'US',
      // Prodigi's quote pricing engine legitimately takes ~5s.
      timeoutMs: 12_000,
      retries: 0,
      item: {
        style: 'unisex',
        size: 'M',
        artworkUrl: artworkUrl(baseUrl(), Date.now()),
        reference: 'health-check',
      },
    });
    const summary = result.quotes?.[0]?.costSummary;
    const costCents = summary ? Math.round(Number(summary.totalCost.amount) * 100) : null;
    checks.economics = {
      ok: true,
      outcome: result.outcome,
      unitCost: summary?.totalCost,
      retailPrice: formatUsd(PRICE_CENTS),
      marginPerShirt: costCents === null ? null : formatUsd(PRICE_CENTS - costCents),
      profitable: costCents === null ? null : costCents < PRICE_CENTS,
    };
  } catch (error) {
    // Advisory only: does not flip `ok`.
    checks.economics = {
      ok: false,
      unavailable: true,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  try {
    const url = artworkUrl(baseUrl(), Date.now());
    const response = await fetch(url, { cache: 'no-store' });
    checks.artwork = {
      ok: response.ok,
      url,
      status: response.status,
      contentType: response.headers.get('content-type'),
      // Prodigi has to be able to fetch this URL anonymously. A 401 here almost
      // always means Vercel Deployment Protection is switched on.
      publiclyReachable: response.ok && response.headers.get('content-type') === 'image/png',
    };
    if (!response.ok) ok = false;
  } catch (error) {
    ok = false;
    checks.artwork = { ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  return Response.json({ ok, config, checks }, { status: ok ? 200 : 503 });
}
