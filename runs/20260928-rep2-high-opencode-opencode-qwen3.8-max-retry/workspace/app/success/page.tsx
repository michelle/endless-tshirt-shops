import Link from 'next/link';
import { fulfillSession, isSessionId, type FulfillResult } from '../../lib/fulfill';
import { baseUrlFromServerHeaders } from '../../lib/url';
import { encodeDesign, formatDate, getPalette } from '../../lib/design';
import { getColor } from '../../lib/catalog';
import { RetryFulfill } from '../../components/retry-fulfill';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Your order — Moonworn' };

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;

  if (!session_id || !isSessionId(session_id)) {
    return (
      <Page>
        <h1 className="font-display text-4xl">Order not found</h1>
        <p className="mt-4 text-mist-300">This confirmation link is missing its order reference.</p>
        <HomeLink />
      </Page>
    );
  }

  const base = await baseUrlFromServerHeaders();
  let result: FulfillResult;
  try {
    result = await fulfillSession(session_id, base);
  } catch (err) {
    result = {
      state: 'failed',
      error: err instanceof Error ? err.message : 'Could not reach Stripe',
      display: { design: null, color: null, size: null, qty: 1, email: null, name: null, amountTotal: null, shipping: null },
    };
  }

  const { display } = result;
  const design = display.design;
  let thumb: string | null = null;
  if (design) {
    try {
      const { d, sig } = encodeDesign(design);
      thumb = `/api/design?d=${d}&sig=${sig}&r=preview`;
    } catch {
      thumb = null;
    }
  }

  const paid = result.state !== 'unpaid' && result.state !== 'failed';
  const sentToPrint = result.state === 'fulfilled' || result.state === 'already';

  return (
    <Page>
      <div className="text-center">
        {paid ? (
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-aurora/15 text-3xl text-aurora">✓</div>
        ) : (
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-night-800 text-3xl text-mist-500">…</div>
        )}
        <h1 className="mt-6 font-display text-4xl sm:text-5xl">
          {sentToPrint ? 'Your night is heading to the press.' : paid ? 'Payment received.' : result.state === 'unpaid' ? 'Awaiting payment.' : 'Something needs attention.'}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-mist-300">
          {sentToPrint
            ? 'Payment cleared, and your one-of-one shirt has been sent to our print partner. They will print it, fold it and ship it straight to you.'
            : result.state === 'unpaid'
              ? 'We have not received payment for this order yet, so nothing has been sent to print. If you just paid, give it a moment and reload.'
              : 'Your payment is safe, but we could not hand the order to our print partner yet. Use the button below — or contact us and we will do it for you.'}
        </p>
      </div>

      {result.state === 'failed' ? (
        <div className="mt-8 flex justify-center">
          <RetryFulfill sessionId={session_id} />
        </div>
      ) : null}

      {result.prodigiOrderId ? (
        <p className="mt-6 text-center text-sm text-mist-500">
          Print order <span data-testid="prodigi-order-id" className="font-mono text-mist-300">{result.prodigiOrderId}</span>
          {result.prodigiStage ? <> · status <span className="text-mist-300">{result.prodigiStage}</span></> : null}
        </p>
      ) : null}

      {design ? (
        <div className="mt-10 grid gap-8 rounded-3xl border border-night-700 bg-night-900/60 p-8 sm:grid-cols-[240px_1fr]">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {thumb ? <img src={thumb} alt="Your night-sky design" className="w-full rounded-xl" /> : null}
          </div>
          <div className="text-sm">
            <h2 className="font-display text-2xl text-mist-100">
              {design.place} · {formatDate(design.date)}
            </h2>
            {design.caption ? <p className="mt-1 italic text-mist-300">“{design.caption}”</p> : null}
            <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 text-mist-300">
              <Row k="Sky" v={getPalette(design.palette).name} />
              <Row k="Shirt" v={display.color ? getColor(display.color).name : '—'} />
              <Row k="Size" v={(display.size ?? '—').toUpperCase()} />
              <Row k="Quantity" v={String(display.qty)} />
              {display.amountTotal ? <Row k="Paid" v={display.amountTotal} /> : null}
              {display.email ? <Row k="Receipt sent to" v={display.email} /> : null}
            </dl>
            {display.shipping ? (
              <p className="mt-5 text-mist-500">
                Shipping to {display.shipping.name ?? display.name ?? ''}
                {display.shipping.line1 ? `, ${display.shipping.line1}` : ''}
                {display.shipping.city ? `, ${display.shipping.city}` : ''}
                {display.shipping.postalCode ? ` ${display.shipping.postalCode}` : ''}
                {display.shipping.country ? `, ${display.shipping.country}` : ''}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="mt-10 flex flex-wrap items-center justify-center gap-4 text-sm">
        <Link href={`/track?session_id=${session_id}`} className="rounded-full border border-night-600 px-6 py-3 text-mist-100 hover:border-mist-500">
          Track this order
        </Link>
        <HomeLink />
      </div>
    </Page>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-mist-500">{k}:</dt>
      <dd>{v}</dd>
    </div>
  );
}

function HomeLink() {
  return (
    <Link href="/" className="rounded-full bg-moonlight px-6 py-3 font-semibold text-night-950 hover:bg-white">
      Design another night
    </Link>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-night-800/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" className="font-display text-2xl tracking-wide text-mist-100">
            MOON<span className="text-moonlight">WORN</span>
          </Link>
          <Link href="/track" className="text-sm text-mist-300 hover:text-mist-100">Track an order</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-16 sm:px-8">{children}</main>
    </div>
  );
}
