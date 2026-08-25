'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';

import { Shirt } from './Shirt';
import { describeTimestamp } from '@/lib/format';
import { isStyleId } from '@/lib/product';

type Order = {
  paymentStatus: string;
  amount: string;
  epochMs: number;
  style: string | null;
  size: string | null;
  email: string | null;
  shippingName: string | null;
  shippingCity: string | null;
  shippingCountry: string | null;
  printOrderId: string | null;
  printStage: string;
  printIssues: string[];
  tracking: { number: string; url: string | null; carrier: string | null } | null;
  fulfillmentError: string | null;
};

export function OrderStatus({ paymentIntentId }: { paymentIntentId: string }) {
  return (
    <Suspense fallback={<p className="stampline">Loading your order…</p>}>
      <OrderStatusInner paymentIntentId={paymentIntentId} />
    </Suspense>
  );
}

function OrderStatusInner({ paymentIntentId }: { paymentIntentId: string }) {
  const searchParams = useSearchParams();
  const clientSecret = searchParams.get('payment_intent_client_secret');
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!clientSecret) {
      setError('This link is missing its payment reference. Open it from your receipt email.');
      return null;
    }
    const response = await fetch(
      `/api/orders/${encodeURIComponent(paymentIntentId)}?cs=${encodeURIComponent(clientSecret)}`,
      { cache: 'no-store' },
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload?.error ?? 'Could not load that order.');
      return null;
    }
    setError(null);
    setOrder(payload);
    return payload as Order;
  }, [clientSecret, paymentIntentId]);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      const result = await load();
      attempts += 1;
      // The print order lands within a few seconds of payment; stop nagging
      // once we have it (or after ~30s).
      if (!cancelled && !result?.printOrderId && attempts < 10) {
        setTimeout(poll, 3000);
      }
    };
    void poll();

    return () => {
      cancelled = true;
    };
  }, [load]);

  if (error) {
    return (
      <div className="panel">
        <div className="alert">{error}</div>
        <p>
          <Link href="/">Back to the store</Link>
        </p>
      </div>
    );
  }

  if (!order) return <p className="stampline">Loading your order…</p>;

  const paid = order.paymentStatus === 'succeeded';

  return (
    <div className="layout">
      <div>
        {/*
          Prodigi's thumbnail is the print separation itself — white ink on
          transparency — so it renders as a blank white rectangle. Our own
          mock-up is both a better preview and always available.
        */}
        <Shirt
          style={isStyleId(order.style) ? order.style : 'unisex'}
          initialMs={order.epochMs}
          lockedMs={order.epochMs}
          showPrice={false}
        />
        <p className="stampline">
          {Number.isFinite(order.epochMs) ? describeTimestamp(order.epochMs) : null}
        </p>
      </div>

      <div className="panel">
        <h2 style={{ fontWeight: 400, fontSize: 22 }}>
          {paid ? 'Congrats on your pretty cool shirt!' : 'This payment has not completed.'}
        </h2>

        <div className="receipt">
          <dl>
            <dt>Printed number</dt>
            <dd className="mono">{order.epochMs}</dd>
            <dt>Shirt</dt>
            <dd>
              {order.style} · {order.size}
            </dd>
            <dt>Paid</dt>
            <dd>{order.amount}</dd>
            <dt>Ships to</dt>
            <dd>
              {[order.shippingName, order.shippingCity, order.shippingCountry]
                .filter(Boolean)
                .join(', ') || '—'}
            </dd>
            <dt>Print order</dt>
            <dd className="mono">{order.printOrderId ?? 'queueing…'}</dd>
            <dt>Status</dt>
            <dd>{order.printStage}</dd>
            {order.tracking ? (
              <>
                <dt>Tracking</dt>
                <dd className="mono">
                  {order.tracking.url ? (
                    <a href={order.tracking.url} target="_blank" rel="noreferrer">
                      {order.tracking.number}
                    </a>
                  ) : (
                    order.tracking.number
                  )}
                </dd>
              </>
            ) : null}
          </dl>
        </div>

        {order.printIssues.length ? (
          <div className="alert">
            {order.printIssues.map((issue) => (
              <div key={issue}>{issue}</div>
            ))}
          </div>
        ) : null}

        {paid && !order.printOrderId ? (
          <div className="alert alert-info">
            Payment received. The print order is still being placed — this page updates itself.
          </div>
        ) : null}

        <p style={{ marginTop: 20 }}>
          <Link href="/">♥ Get another shirt</Link>
        </p>
      </div>
    </div>
  );
}
