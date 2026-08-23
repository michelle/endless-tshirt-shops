'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { STYLE_LABELS, formatUsd } from '@/lib/catalog';
import type { PublicOrder } from '@/lib/orders';

/**
 * The confirmation page doubles as a fulfilment trigger. On mount it POSTs to
 * /api/order, which places the print order if the webhook hasn't already, then
 * polls until the printer hands back an order id.
 *
 * Two independent triggers (this and the webhook) mean a misconfigured webhook
 * secret degrades to "slightly slower" instead of "silently unfulfilled".
 */

const POLL_INTERVAL_MS = 2_500;
const POLL_TIMEOUT_MS = 45_000;

type Phase = 'loading' | 'ready' | 'missing' | 'error';

export function OrderStatus() {
  const params = useSearchParams();
  const paymentIntent = params.get('payment_intent');
  const clientSecret = params.get('payment_intent_client_secret');

  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [message, setMessage] = useState<string | null>(null);
  const startedAt = useRef(Date.now());

  const query = useCallback(
    async (method: 'GET' | 'POST'): Promise<PublicOrder | null> => {
      if (!paymentIntent || !clientSecret) return null;
      const search = new URLSearchParams({
        payment_intent: paymentIntent,
        payment_intent_client_secret: clientSecret,
      });
      const res = await fetch(`/api/order?${search.toString()}`, { method, cache: 'no-store' });
      const payload = (await res.json().catch(() => ({}))) as {
        order?: PublicOrder;
        error?: { message?: string };
      };
      if (!res.ok || !payload.order) {
        throw new Error(payload.error?.message ?? 'We could not look up that order.');
      }
      return payload.order;
    },
    [paymentIntent, clientSecret],
  );

  useEffect(() => {
    if (!paymentIntent || !clientSecret) {
      setPhase('missing');
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const settled = (candidate: PublicOrder) =>
      candidate.orderId !== null || candidate.state === 'failed' || !candidate.paid;

    const loop = async (method: 'GET' | 'POST') => {
      try {
        const next = await query(method);
        if (cancelled || !next) return;
        setOrder(next);
        setPhase('ready');

        const expired = Date.now() - startedAt.current > POLL_TIMEOUT_MS;
        if (!settled(next) && !expired) {
          timer = setTimeout(() => void loop('GET'), POLL_INTERVAL_MS);
        }
      } catch (cause) {
        if (cancelled) return;
        setMessage(cause instanceof Error ? cause.message : 'Something went wrong.');
        setPhase('error');
      }
    };

    // POST first: place the order if it isn't placed yet.
    void loop('POST');

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [paymentIntent, clientSecret, query]);

  if (phase === 'missing') {
    return (
      <Notice title="Nothing to show here">
        <p>
          This page needs an order reference. If you just bought a shirt, use the link in your
          receipt email.
        </p>
        <StartOver />
      </Notice>
    );
  }

  if (phase === 'error') {
    return (
      <Notice title="We couldn’t load your order">
        <p>{message}</p>
        <p className="text-sm">
          Your payment is safe either way — if you were charged, the order is recorded in Stripe and
          we will follow up.
        </p>
        <StartOver />
      </Notice>
    );
  }

  if (phase === 'loading' || !order) {
    return (
      <div className="flex min-h-64 items-center justify-center text-[var(--color-muted)]">
        <Spinner /> <span className="ml-2.5">Confirming your order…</span>
      </div>
    );
  }

  return <OrderReceipt order={order} />;
}

function OrderReceipt({ order }: { order: PublicOrder }) {
  const placed = order.orderId !== null;
  const working = order.paid && !placed && order.state !== 'failed';

  return (
    <div className="dt-rise grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-14">
      <div>
        <div className="overflow-hidden rounded-2xl bg-[var(--color-ink)] p-6 sm:p-8">
          <p className="mb-3 text-[11px] tracking-widest text-white/40 uppercase">
            Your print
          </p>
          {order.timestampMs ? (
            // The actual artwork file we send to the printer.
            <img
              src={`/api/artwork?t=${order.timestampMs}`}
              alt={`Artwork reading ${order.timestampMs}`}
              className="w-full"
              width={2400}
              height={375}
            />
          ) : (
            <p className="text-white/60">Artwork unavailable</p>
          )}
        </div>
        <p className="mt-3 text-xs text-[var(--color-muted)]">
          White direct-to-garment print, 8″ wide, 3″ below the collar.
        </p>
      </div>

      <div>
        {!order.paid ? (
          <Heading kicker="Payment incomplete" title="We haven’t taken your money" />
        ) : placed ? (
          <Heading kicker="Order confirmed" title="Congrats on your pretty cool shirt!" />
        ) : order.state === 'failed' ? (
          <Heading kicker="Needs attention" title="Your payment went through" />
        ) : (
          <Heading kicker="Order confirmed" title="Congrats on your pretty cool shirt!" />
        )}

        <p className="mt-4 text-[15px] leading-relaxed text-[var(--color-muted)]">
          {order.paid
            ? order.message
            : 'This payment was not completed, so nothing has been charged and no shirt has been ordered.'}
        </p>

        {working ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-[var(--color-muted)]">
            <Spinner /> Sending your artwork to the printer…
          </p>
        ) : null}

        <dl className="mt-7 divide-y divide-[var(--color-hairline)] border-y border-[var(--color-hairline)] text-sm">
          <Row label="Printed timestamp">
            <span className="tnum">{order.timestampMs ?? '—'}</span>
          </Row>
          <Row label="Shirt">
            {order.style ? STYLE_LABELS[order.style] : '—'} · {order.size ?? '—'} · Black
          </Row>
          <Row label="Paid">
            {formatUsd(order.amountCents)} {order.currency.toUpperCase()}
            {order.paid ? '' : ' (not charged)'}
          </Row>
          {order.email ? <Row label="Receipt sent to">{order.email}</Row> : null}
          {order.city ? <Row label="Shipping to">{order.city}</Row> : null}
          <Row label="Printer order">
            {order.orderId ? (
              <span className="tnum">{order.orderId}</span>
            ) : (
              <span className="text-[var(--color-muted)]">pending</span>
            )}
          </Row>
        </dl>

        {order.testMode ? (
          <p className="mt-5 rounded-xl border border-[var(--color-accent-soft)] bg-[var(--color-accent-wash)] px-4 py-3 text-[13px] text-[var(--color-accent)]">
            Test mode — this order was placed against the Scalable Press sandbox, so nothing will
            actually be printed or shipped.
          </p>
        ) : null}

        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--color-ink)] px-6 text-[15px] font-medium text-white no-underline transition hover:opacity-85"
          >
            ♥ Get another shirt
          </Link>
        </div>
      </div>
    </div>
  );
}

function Heading({ kicker, title }: { kicker: string; title: string }) {
  return (
    <>
      <p className="text-[11px] font-medium tracking-widest text-[var(--color-accent)] uppercase">
        {kicker}
      </p>
      <h2 className="mt-2 text-2xl leading-tight font-normal tracking-tight sm:text-3xl">{title}</h2>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-3">
      <dt className="text-[var(--color-muted)]">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="max-w-xl space-y-3">
      <h2 className="text-2xl font-normal tracking-tight">{title}</h2>
      <div className="space-y-3 text-[15px] text-[var(--color-muted)]">{children}</div>
    </div>
  );
}

function StartOver() {
  return (
    <p>
      <Link href="/" className="text-[var(--color-accent)] underline">
        Back to the store
      </Link>
    </p>
  );
}

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" className="dt-spin inline-block h-4 w-4" aria-hidden>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
