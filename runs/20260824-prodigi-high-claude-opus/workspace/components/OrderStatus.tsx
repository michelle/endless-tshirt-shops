'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Shirt from './Shirt';
import { formatUsd, type ShirtStyle } from '@/lib/catalog';

/**
 * Order confirmation. The successor to the original store's
 * "Congrats on your pretty cool shirt!" panel.
 *
 * Stripe redirects here with `payment_intent` and `payment_intent_client_secret`.
 * We hand both to /api/order, which uses the client secret as proof that this
 * browser owns the order — and which also places the Prodigi order if the webhook
 * has not already done so. So this page keeps polling until print is confirmed.
 */

type OrderView = {
  paymentIntentId: string;
  paymentStatus: string;
  paid: boolean;
  amount: number;
  currency: string;
  email: string | null;
  shirt: {
    timestampMs: number;
    timestampIso: string;
    style: ShirtStyle;
    styleLabel: string;
    garment: string;
    size: string;
  } | null;
  shipTo: string | null;
  fulfillment: {
    status: 'fulfilled' | 'pending' | 'failed';
    prodigiOrderId: string | null;
    stage: string | null;
    dryRun: boolean;
    error: string | null;
  };
};

const POLL_INTERVAL_MS = 2500;
const MAX_POLLS = 16;

export default function OrderStatus() {
  const params = useSearchParams();
  const paymentIntent = params.get('payment_intent');
  const clientSecret = params.get('payment_intent_client_secret');
  const redirectStatus = params.get('redirect_status');

  const [order, setOrder] = useState<OrderView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [polls, setPolls] = useState(0);

  useEffect(() => {
    if (!paymentIntent || !clientSecret) {
      setError('This link is missing its order reference.');
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const load = async (attempt: number) => {
      try {
        const response = await fetch(
          `/api/order?payment_intent=${encodeURIComponent(paymentIntent)}` +
            `&payment_intent_client_secret=${encodeURIComponent(clientSecret)}`,
          { cache: 'no-store' },
        );
        const payload = await response.json();
        if (cancelled) return;

        if (!response.ok) {
          setError(payload.error ?? 'Could not load your order.');
          return;
        }

        setOrder(payload as OrderView);
        setPolls(attempt);

        const done =
          payload.fulfillment?.status === 'fulfilled' ||
          payload.fulfillment?.status === 'failed';
        if (!done && attempt < MAX_POLLS) {
          timer = setTimeout(() => load(attempt + 1), POLL_INTERVAL_MS);
        }
      } catch {
        if (!cancelled) setError('Could not reach the shop. Please refresh.');
      }
    };

    load(1);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [paymentIntent, clientSecret]);

  if (error) {
    return (
      <>
        <h2>We could not find that order</h2>
        <p>{error}</p>
        <p>
          If you were charged, your Stripe receipt email has the reference — reply
          to it and we will sort it out.
        </p>
        <Link className="btn-secondary" href="/">
          Back to the store
        </Link>
      </>
    );
  }

  if (!order) {
    return (
      <>
        <h2>Confirming your order…</h2>
        <div className="skeleton" style={{ maxWidth: 420 }} />
      </>
    );
  }

  if (!order.paid) {
    const failed = redirectStatus === 'failed' || order.paymentStatus === 'canceled';
    return (
      <>
        <h2>{failed ? 'That payment did not go through' : 'Your payment is still processing'}</h2>
        <p>
          {failed
            ? 'Nothing was charged. Your millisecond is still available — well, a new one is.'
            : 'Some payment methods take a little while to settle. We will email you the moment it clears, and printing starts automatically.'}
        </p>
        <p>
          Payment status: <span className="status-pill">{order.paymentStatus}</span>
        </p>
        <Link className="btn-secondary" href="/">
          Back to the store
        </Link>
      </>
    );
  }

  const { shirt, fulfillment } = order;

  return (
    <>
      <h2>Congrats on your pretty cool shirt!</h2>
      <p>
        You bought this exact millisecond, and nobody else can. It is on its way to
        the printer now.
      </p>

      {shirt ? (
        <>
          <div className="order-stamp">{shirt.timestampMs}</div>
          <p style={{ color: 'var(--ink-faint)', fontSize: 13 }}>{shirt.timestampIso}</p>
          {/* The shirt they actually bought, clock stopped on their millisecond. */}
          <div className="order-shirt">
            <Shirt style={shirt.style} frozenAt={shirt.timestampMs} showPrice={false} showCaption={false} />
          </div>
          <p style={{ fontSize: 13 }}>
            <a
              className="link-quiet"
              href={`/api/artwork?t=${shirt.timestampMs}&format=preview`}
              target="_blank"
              rel="noreferrer"
            >
              See the exact print file the printer receives →
            </a>
          </p>
        </>
      ) : null}

      <dl className="summary">
        <div>
          <dt>Paid</dt>
          <dd>{formatUsd(order.amount)}</dd>
        </div>
        {shirt ? (
          <div>
            <dt>Shirt</dt>
            <dd>
              {shirt.styleLabel} · {shirt.size} · black
            </dd>
          </div>
        ) : null}
        {shirt ? (
          <div>
            <dt>Garment</dt>
            <dd>{shirt.garment}</dd>
          </div>
        ) : null}
        {order.shipTo ? (
          <div>
            <dt>Ships to</dt>
            <dd>{order.shipTo}</dd>
          </div>
        ) : null}
        <div>
          <dt>Payment reference</dt>
          <dd style={{ fontFamily: 'monospace', fontSize: 13 }}>{order.paymentIntentId}</dd>
        </div>
        <div>
          <dt>Print order</dt>
          <dd>
            {fulfillment.status === 'fulfilled' ? (
              <>
                <span style={{ fontFamily: 'monospace', fontSize: 13 }}>
                  {fulfillment.prodigiOrderId}
                </span>
                {fulfillment.stage ? (
                  <>
                    {' '}
                    <span className="status-pill">{fulfillment.stage}</span>
                  </>
                ) : null}
              </>
            ) : fulfillment.status === 'failed' ? (
              <span className="status-pill">needs attention</span>
            ) : (
              <span className="status-pill">
                {polls >= MAX_POLLS ? 'queued' : 'submitting…'}
              </span>
            )}
          </dd>
        </div>
      </dl>

      {fulfillment.dryRun ? (
        <div className="alert" data-tone="info">
          <strong>Dry-run mode.</strong> Payment was taken but no print order was
          submitted to Prodigi. Unset <code>PRODIGI_DRY_RUN</code> to fulfill for
          real.
        </div>
      ) : null}

      {fulfillment.status === 'failed' ? (
        <div className="alert" data-tone="error">
          <strong>Your payment went through, but the printer did not accept the
          order yet.</strong>{' '}
          We have the details and will get it printed — no action needed from you.
          <br />
          <span style={{ fontSize: 12.5, opacity: 0.85 }}>{fulfillment.error}</span>
        </div>
      ) : null}

      {fulfillment.status === 'pending' && polls >= MAX_POLLS ? (
        <div className="alert" data-tone="info">
          Still confirming with the printer. This is safe to leave — you will get an
          email either way.
        </div>
      ) : null}

      <p>
        {order.email
          ? `A receipt is on its way to ${order.email}.`
          : 'Your receipt is available from your payment provider.'}
      </p>

      <Link className="btn-secondary" href="/">
        Get another shirt
      </Link>
    </>
  );
}
