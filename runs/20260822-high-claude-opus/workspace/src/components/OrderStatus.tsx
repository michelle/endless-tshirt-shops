'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import type { OrderView } from '@/lib/orderView';
import { formatUsd } from '@/lib/catalog';

const POLL_INTERVAL_MS = 2500;
const MAX_POLLS = 12;

/** Settled states need no further polling. */
function isSettled(order: OrderView): boolean {
  if (order.fulfillment === 'placed') return true;
  return !order.paid && order.paymentStatus !== 'processing';
}

export default function OrderStatus({
  initialOrder,
  clientSecret,
}: {
  initialOrder: OrderView;
  clientSecret: string;
}) {
  const [order, setOrder] = useState(initialOrder);

  useEffect(() => {
    if (isSettled(order)) return;

    let polls = 0;
    let cancelled = false;

    const timer = window.setInterval(async () => {
      if (cancelled || polls >= MAX_POLLS) {
        window.clearInterval(timer);
        return;
      }
      polls += 1;
      try {
        const res = await fetch(
          `/api/orders/${order.id}?client_secret=${encodeURIComponent(clientSecret)}`,
          { cache: 'no-store' },
        );
        if (!res.ok) return;
        const payload = await res.json();
        if (!cancelled && payload.order) {
          setOrder(payload.order);
          if (isSettled(payload.order)) window.clearInterval(timer);
        }
      } catch {
        // Transient; the next tick tries again.
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [order, clientSecret]);

  if (!order.paid) {
    return (
      <Card>
        <Heading tone="pending">
          {order.paymentStatus === 'processing'
            ? 'Your payment is still clearing.'
            : 'This order has not been paid.'}
        </Heading>
        <p className="mt-2 text-sm text-slate-600">
          {order.paymentStatus === 'processing'
            ? 'Hang on a moment — we send your shirt to the printer as soon as the payment settles. This page updates itself.'
            : 'Nothing was charged, and nothing was printed. You can start again whenever you like.'}
        </p>
        <Details order={order} />
        <Actions />
      </Card>
    );
  }

  return (
    <Card>
      <Heading tone={order.fulfillment === 'placed' ? 'success' : 'pending'}>
        Congrats on your pretty cool shirt!
      </Heading>

      {order.fulfillment === 'placed' ? (
        <p className="mt-2 text-sm text-slate-600">
          Your payment went through and the print job is with our printer. A receipt is on
          its way to {order.email ?? 'your inbox'}.
        </p>
      ) : (
        <p className="mt-2 text-sm text-slate-600">
          Your payment went through — we&apos;re handing the print job to our printer now.
          {order.fulfillmentError ? ' It is taking a couple of tries.' : ''} You are not
          charged twice and this page updates itself.
        </p>
      )}

      <Details order={order} />
      <Actions />
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/[0.04] sm:p-8">
      {children}
    </div>
  );
}

function Heading({ tone, children }: { tone: 'success' | 'pending'; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={`mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white ${
          tone === 'success' ? 'bg-emerald-500' : 'bg-amber-500'
        }`}
        aria-hidden="true"
      >
        {tone === 'success' ? (
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
        )}
      </span>
      <h2 className="text-xl font-medium text-slate-900 sm:text-2xl">{children}</h2>
    </div>
  );
}

function Details({ order }: { order: OrderView }) {
  return (
    <dl className="mt-6 grid gap-x-8 gap-y-4 border-t border-slate-200 pt-6 sm:grid-cols-2">
      {order.epochMs !== null && (
        <Field label="Printed on the shirt" wide>
          <span className="font-mono text-lg font-bold tabular-nums text-slate-900">
            {order.epochMs}
          </span>
          {order.printedAt && (
            <span className="mt-0.5 block text-xs text-slate-500">{order.printedAt}</span>
          )}
        </Field>
      )}
      {order.reference && (
        <Field label="Order reference">
          <span className="font-mono text-xs break-all">{order.reference}</span>
        </Field>
      )}
      <Field label="Shirt">
        {[order.styleLabel, order.size].filter(Boolean).join(' · ') || '—'}
      </Field>
      <Field label="Paid">{formatUsd(order.amount)} {order.currency.toUpperCase()}</Field>
      {order.shipping && (
        <Field label="Ships to">
          {[
            order.shipping.name,
            order.shipping.line1,
            order.shipping.line2,
            [order.shipping.city, order.shipping.state, order.shipping.postalCode]
              .filter(Boolean)
              .join(', '),
          ]
            .filter(Boolean)
            .map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
        </Field>
      )}
    </dl>
  );
}

function Field({
  label,
  children,
  wide,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? 'sm:col-span-2' : undefined}>
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-slate-800">{children}</dd>
    </div>
  );
}

function Actions() {
  return (
    <div className="mt-8">
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
          <path d="M12 21s-7.5-4.6-9.3-9A5.3 5.3 0 0 1 12 6.6 5.3 5.3 0 0 1 21.3 12c-1.8 4.4-9.3 9-9.3 9z" />
        </svg>
        Get another shirt
      </Link>
    </div>
  );
}
