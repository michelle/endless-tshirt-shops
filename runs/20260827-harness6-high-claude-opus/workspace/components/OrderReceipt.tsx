'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { STYLE_SPECS, formatUsd } from '@/lib/catalog';

export type OrderResponse = {
  state: 'unpaid' | 'pending' | 'placed' | 'failed';
  session: {
    id: string;
    ts: number | null;
    style: 'fitted' | 'unisex' | null;
    size: string | null;
    email: string | null;
    name: string | null;
    amountTotal: number | null;
    paid: boolean;
  };
  order?: {
    id: string;
    stage: string;
    issues: Array<{ description?: string; errorCode?: string }>;
    shipments: Array<{
      carrier: string | null;
      tracking: string | null;
      trackingUrl: string | null;
      dispatchDate: string | null;
    }>;
  };
  error?: string;
};

const STAGE_COPY: Record<string, string> = {
  Received: 'Received by printer',
  Draft: 'Received by printer',
  InProgress: 'In production',
  Complete: 'Shipped',
  Cancelled: 'Cancelled',
};

type Props = {
  sessionId: string;
  /** Rendered under the receipt; lets the shop page offer "buy another". */
  footer?: React.ReactNode;
  /** Offer the bookmarkable order page (suppressed when we're already on it). */
  showPermalink?: boolean;
};

export default function OrderReceipt({ sessionId, footer, showPermalink }: Props) {
  const [data, setData] = useState<OrderResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const attempts = useRef(0);

  const request = useCallback(
    async (method: 'GET' | 'POST') => {
      const res = await fetch(`/api/order/${encodeURIComponent(sessionId)}`, {
        method,
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error((await res.json().catch(() => ({}))).error ?? 'Could not load order.');
      }
      return (await res.json()) as OrderResponse;
    },
    [sessionId],
  );

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const run = async () => {
      try {
        // Fast read first so the customer sees their receipt immediately.
        const peek = await request('GET');
        if (cancelled) return;
        setData(peek);
        setError(null);

        if (peek.state === 'unpaid') {
          // Stripe is still settling; check back until it isn't.
          if (attempts.current < 12) {
            attempts.current += 1;
            timer = setTimeout(run, 2500);
          }
          return;
        }

        if (peek.state === 'pending') {
          // Hand it to the printer. This is the slow (~7s) call, and by now the
          // customer already has something to read.
          setPlacing(true);
          const placed = await request('POST');
          if (cancelled) return;
          setPlacing(false);
          setData(placed);
        }
      } catch (err) {
        if (cancelled) return;
        setPlacing(false);
        setError(err instanceof Error ? err.message : 'Could not load order.');
      }
    };

    run();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [request]);

  if (error) {
    return (
      <div className="receipt">
        <div className="notice notice-error">{error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="receipt">
        <p>Looking up your order…</p>
      </div>
    );
  }

  const { session, order } = data;
  const styleLabel = session.style ? STYLE_SPECS[session.style].label : null;

  return (
    <div className="receipt">
      <h2>
        {data.state === 'unpaid' ? 'Payment still settling' : 'Congrats on your pretty cool shirt.'}
      </h2>

      {data.state === 'placed' && (
        <p>
          It&rsquo;s with the printer. Stripe emailed your receipt
          {session.email ? ` to ${session.email}` : ''}; keep this page for tracking.
        </p>
      )}
      {data.state === 'pending' && (
        <p>
          Paid. {placing ? 'Sending it to the printer…' : 'Queued for the printer.'}
        </p>
      )}
      {data.state === 'unpaid' && (
        <p>We haven&rsquo;t seen the payment land yet. This page updates itself.</p>
      )}
      {data.state === 'failed' && (
        <div className="notice notice-error">
          Your payment went through, but we couldn&rsquo;t hand the order to the printer. We&rsquo;ve
          logged it and will sort it out — no need to pay again.
          {data.error ? <div style={{ marginTop: 8, fontSize: 12.5 }}>{data.error}</div> : null}
        </div>
      )}

      <dl>
        {session.ts !== null && (
          <>
            <dt>Printed</dt>
            <dd className="mono">{session.ts}</dd>
            <dt>That is</dt>
            <dd>{new Date(session.ts).toUTCString()}</dd>
          </>
        )}
        {styleLabel && (
          <>
            <dt>Shirt</dt>
            <dd>
              {styleLabel} · {session.size} · black
            </dd>
          </>
        )}
        {session.amountTotal !== null && (
          <>
            <dt>Paid</dt>
            <dd>{formatUsd(session.amountTotal)}</dd>
          </>
        )}
        {order && (
          <>
            <dt>Printer</dt>
            <dd className="mono">{order.id}</dd>
            <dt>Status</dt>
            <dd>
              <span className="pill">{STAGE_COPY[order.stage] ?? order.stage}</span>
            </dd>
          </>
        )}
        <dt>Order</dt>
        <dd className="mono">{session.id}</dd>
      </dl>

      {order?.shipments?.length ? (
        <div className="notice notice-info">
          {order.shipments.map((s, i) => (
            <div key={i}>
              {s.carrier ?? 'Carrier'}
              {s.tracking ? (
                <>
                  {' · '}
                  {s.trackingUrl ? (
                    <a href={s.trackingUrl} target="_blank" rel="noreferrer">
                      {s.tracking}
                    </a>
                  ) : (
                    s.tracking
                  )}
                </>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {order?.issues?.length ? (
        <div className="notice notice-error">
          {order.issues.map((issue, i) => (
            <div key={i}>{issue.description ?? issue.errorCode}</div>
          ))}
        </div>
      ) : null}

      {showPermalink && (
        <p style={{ fontSize: 13, marginBottom: 18 }}>
          <a href={`/order/${encodeURIComponent(sessionId)}`}>Bookmark this order</a> to check on it
          later.
        </p>
      )}

      {footer}
    </div>
  );
}
