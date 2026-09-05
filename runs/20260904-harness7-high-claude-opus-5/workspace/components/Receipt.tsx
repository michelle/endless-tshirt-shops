'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PRODUCTS, type Size, type Style } from '@/lib/catalog';
import { previewPath } from '@/lib/artwork';

type Status = {
  paid: boolean;
  email?: string | null;
  shirt: { timestamp: number; style: Style; size: Size } | null;
  fulfilment:
    | { state: 'awaiting-payment' }
    | { state: 'placed'; prodigiOrderId: string; stage: string; tracking: { number?: string; url?: string } | null }
    | { state: 'needs-attention'; message: string; recordedError?: string | null };
};

/**
 * The confirmation screen.
 *
 * It polls rather than rendering once, because placing the Prodigi order can
 * land a second or two after Stripe redirects the buyer back. Polling stops as
 * soon as there is a final answer so we are not hammering the API forever on a
 * tab someone left open.
 */
export function Receipt({ sessionId }: { sessionId: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;

    const poll = async () => {
      attempts += 1;
      try {
        const res = await fetch(`/api/order/${encodeURIComponent(sessionId)}`, {
          cache: 'no-store',
        });
        if (!res.ok) throw new Error('We could not find that order.');
        const payload: Status = await res.json();
        if (cancelled) return;
        setStatus(payload);

        const settled = payload.paid && payload.fulfilment.state !== 'awaiting-payment';
        if (!settled && attempts < 12) {
          timer = setTimeout(poll, 2500);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Something went wrong.');
      }
    };

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [sessionId]);

  if (error) {
    return (
      <div className="receipt">
        <h2>We could not load that order</h2>
        <p className="error">{error}</p>
        <p style={{ marginTop: 20 }}>
          <Link href="/">Back to the store</Link>
        </p>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="receipt">
        <h2>
          <span className="spinner" aria-hidden="true" />
          Checking your order…
        </h2>
      </div>
    );
  }

  const { shirt, fulfilment } = status;

  return (
    <div className="receipt">
      <h2>
        {status.paid ? 'Congrats on your pretty cool shirt!' : 'Your payment is still processing'}
      </h2>
      <p style={{ color: 'var(--muted)' }}>
        {status.paid
          ? `A receipt is on its way${status.email ? ` to ${status.email}` : ''}.`
          : 'This page will update as soon as your bank confirms the payment.'}
      </p>

      {shirt && (
        <div style={{ marginTop: 28, maxWidth: 360 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewPath(shirt.timestamp, shirt.style)}
            alt={`Black ${PRODUCTS[shirt.style].label.toLowerCase()} t-shirt printed with ${shirt.timestamp}`}
            width={360}
            height={360}
            style={{ width: '100%', height: 'auto', borderRadius: 6 }}
          />
        </div>
      )}

      <dl>
        {shirt && (
          <>
            <dt>Moment</dt>
            <dd>
              <code>{shirt.timestamp}</code>
              <br />
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>
                {new Date(shirt.timestamp).toUTCString()}
              </span>
            </dd>
            <dt>Shirt</dt>
            <dd>
              {PRODUCTS[shirt.style].label} · {shirt.size} · black
            </dd>
          </>
        )}

        <dt>Production</dt>
        <dd>
          {fulfilment.state === 'placed' && (
            <>
              {fulfilment.stage}
              <br />
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>
                Prodigi order <code>{fulfilment.prodigiOrderId}</code>
              </span>
              {fulfilment.tracking?.url && (
                <>
                  <br />
                  <a href={fulfilment.tracking.url} target="_blank" rel="noreferrer">
                    Track this shipment
                  </a>
                </>
              )}
            </>
          )}
          {fulfilment.state === 'awaiting-payment' && 'Waiting on payment confirmation'}
          {fulfilment.state === 'needs-attention' && (
            <>
              <span className="spinner" aria-hidden="true" />
              Sending to the printer…
              <br />
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>
                Your payment went through. If this does not resolve, we will email you —
                nothing more is needed from you.
              </span>
            </>
          )}
        </dd>
      </dl>

      <p style={{ marginTop: 32 }}>
        <Link href="/">Get another shirt →</Link>
      </p>
    </div>
  );
}
