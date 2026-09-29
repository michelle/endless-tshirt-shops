import Link from 'next/link';
import { stripe } from '../../lib/stripe';
import { getOrder, type ProdigiOrder } from '../../lib/prodigi';
import { isSessionId } from '../../lib/fulfill';
import { formatDate } from '../../lib/design';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Track your order — Moonworn' };

export default async function TrackPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  const sessionId = session_id && isSessionId(session_id) ? session_id : null;

  let paymentStatus: string | null = null;
  let designLine: string | null = null;
  let prodigiOrder: ProdigiOrder | null = null;
  let lookupError: string | null = null;

  if (sessionId) {
    try {
      const session = await stripe().checkout.sessions.retrieve(sessionId);
      paymentStatus = session.payment_status;
      try {
        const design = JSON.parse(session.metadata?.designJson ?? 'null');
        if (design?.place && design?.date) designLine = `${design.place} · ${formatDate(design.date)}`;
      } catch {
        /* not a Moonworn order; still show payment state */
      }
      const prodigiOrderId = session.metadata?.prodigiOrderId;
      if (prodigiOrderId) {
        try {
          const res = await getOrder(prodigiOrderId);
          prodigiOrder = res.order ?? null;
        } catch (err) {
          lookupError = err instanceof Error ? err.message : 'Could not reach the print partner';
        }
      }
    } catch (err) {
      lookupError = err instanceof Error ? err.message : 'Could not find that order';
    }
  }

  const paid = paymentStatus === 'paid';

  return (
    <div className="min-h-screen">
      <header className="border-b border-night-800/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" className="font-display text-2xl tracking-wide text-mist-100">
            MOON<span className="text-moonlight">WORN</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-5 py-16 sm:px-8">
        <h1 className="font-display text-4xl">Track your order</h1>
        <p className="mt-3 text-sm text-mist-300">
          Paste the order reference from your confirmation link (it starts with <span className="font-mono">cs_</span>).
        </p>
        <form method="GET" action="/track" className="mt-6 flex gap-3">
          <input
            type="text"
            name="session_id"
            defaultValue={sessionId ?? ''}
            placeholder="cs_test_…"
            className="w-full rounded-xl border border-night-600 bg-night-900/80 px-4 py-3 font-mono text-sm text-mist-100 placeholder:text-mist-500/60 outline-none focus:border-aurora/70"
          />
          <button type="submit" className="shrink-0 rounded-xl bg-moonlight px-6 py-3 font-semibold text-night-950 hover:bg-white">
            Track
          </button>
        </form>

        {lookupError ? <p className="mt-6 rounded-xl border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-300">{lookupError}</p> : null}

        {sessionId && !lookupError ? (
          <ol className="mt-10 space-y-6">
            <Step done={paid} label="Payment" detail={paymentStatus === 'paid' ? 'Received via Stripe.' : paymentStatus === 'unpaid' ? 'Not paid yet — nothing has been sent to print.' : `Status: ${paymentStatus ?? 'unknown'}`} />
            <Step
              done={Boolean(prodigiOrder)}
              label="Sent to print"
              detail={
                prodigiOrder
                  ? `Print order ${prodigiOrder.id} accepted by our fulfilment partner${designLine ? ` — ${designLine}` : ''}.`
                  : paid
                    ? 'Payment is in; the print order has not been handed over yet. Reload in a moment.'
                    : 'Happens only after payment succeeds.'
              }
            />
            <Step
              done={Boolean(prodigiOrder?.status && ['InProgress', 'Complete'].includes(prodigiOrder.status.stage))}
              label="In production"
              detail={
                prodigiOrder?.status
                  ? `Stage: ${prodigiOrder.status.stage}${prodigiOrder.status.details ? ` · assets ${prodigiOrder.status.details.downloadAssets ?? '—'}, production ${prodigiOrder.status.details.inProduction ?? '—'}` : ''}`
                  : 'Direct-to-garment printing takes 3–5 days.'
              }
            />
            <Step
              done={Boolean(prodigiOrder?.shipments?.some((s) => s.status === 'Shipped'))}
              label="Shipped"
              detail={
                prodigiOrder?.shipments?.length
                  ? prodigiOrder.shipments
                      .map((s) =>
                        s.tracking?.number || s.tracking?.url
                          ? `${s.carrier?.name ?? 'Carrier'} ${s.tracking?.number ?? ''} ${s.tracking?.url ?? ''}`.trim()
                          : `Shipment ${s.id}: ${s.status}`,
                      )
                      .join(' · ')
                  : 'Tracking appears here once your parcel is dispatched.'
              }
            />
          </ol>
        ) : null}

        <p className="mt-12 text-xs text-mist-500">
          Demo storefront: payments run in Stripe test mode and orders go to Prodigi&apos;s sandbox — nothing is really printed or shipped.
        </p>
      </main>
    </div>
  );
}

function Step({ done, label, detail }: { done: boolean; label: string; detail: string }) {
  return (
    <li className="flex gap-4">
      <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm ${done ? 'bg-aurora/20 text-aurora' : 'bg-night-800 text-mist-500'}`}>
        {done ? '✓' : '○'}
      </span>
      <div>
        <p className={`font-semibold ${done ? 'text-mist-100' : 'text-mist-500'}`}>{label}</p>
        <p className="mt-1 text-sm text-mist-300">{detail}</p>
      </div>
    </li>
  );
}
