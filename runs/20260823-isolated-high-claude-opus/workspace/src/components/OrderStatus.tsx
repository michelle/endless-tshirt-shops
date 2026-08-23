'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { formatUsd, isShirtStyle, type ShirtStyle } from '@/lib/catalog';
import { Shirt } from './Shirt';

type OrderResponse = {
  payment: string;
  fulfillment:
    | { status: 'placed'; orderId: string }
    | { status: 'placing' }
    | { status: 'awaiting_payment' }
    | { status: 'failed'; message: string };
  shirt: { timestamp: number | null; style: string | null; size: string | null };
  amount: number;
  email: string | null;
  livemode: boolean;
};

/** Poll every 2s for up to 90s while fulfilment settles. */
const POLL_MS = 2000;
const POLL_LIMIT = 45;

export function OrderStatus({ font }: { font: string }) {
  const params = useSearchParams();
  const paymentIntent = params.get('payment_intent');
  const clientSecret = params.get('payment_intent_client_secret');

  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    if (!paymentIntent || !clientSecret) {
      setError('This link is missing its order reference.');
      return;
    }

    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      attempts += 1;
      try {
        const res = await fetch(
          `/api/order?payment_intent=${encodeURIComponent(paymentIntent)}` +
            `&payment_intent_client_secret=${encodeURIComponent(clientSecret)}`,
        );
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(body.error ?? 'We could not find that order.');
          return;
        }
        setOrder(body as OrderResponse);

        const settled =
          body.fulfillment?.status === 'placed' || body.fulfillment?.status === 'failed';
        if (settled) return;
        if (attempts >= POLL_LIMIT) {
          setGaveUp(true);
          return;
        }
        timer = setTimeout(poll, POLL_MS);
      } catch {
        if (cancelled) return;
        if (attempts >= POLL_LIMIT) {
          setGaveUp(true);
          return;
        }
        timer = setTimeout(poll, POLL_MS);
      }
    };

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [clientSecret, paymentIntent]);

  if (error) {
    return (
      <div className="success">
        <div className="alert" role="alert">
          {error}
        </div>
        <Link className="btn" href="/" style={{ textDecoration: 'none', maxWidth: 320 }}>
          Back to the shop
        </Link>
      </div>
    );
  }

  if (!order) return <p className="locked">Looking up your order…</p>;

  const style: ShirtStyle = isShirtStyle(order.shirt.style) ? order.shirt.style : 'fitted';
  const paid = order.payment === 'succeeded';

  return (
    <div className="columns">
      <div>
        {order.shirt.timestamp !== null && (
          <Shirt style={style} frozenAt={order.shirt.timestamp} font={font} />
        )}
      </div>
      <div className="success">
        {paid ? (
          <>
            <h2>Congrats on your pretty cool shirt!</h2>
            <p>
              We charged {formatUsd(order.amount)} and sent a receipt
              {order.email ? ` to ${order.email}` : ''}.
            </p>
            {order.shirt.timestamp !== null && (
              <p>
                Your shirt reads{' '}
                <span className="order-id">{order.shirt.timestamp}</span> — that is{' '}
                {new Date(order.shirt.timestamp).toUTCString()}. Size {order.shirt.size}, {style}{' '}
                cut.
              </p>
            )}
            <Fulfillment state={order.fulfillment} gaveUp={gaveUp} />
          </>
        ) : (
          <>
            <h2>Your payment is still processing</h2>
            <p>
              Payment status is <span className="order-id">{order.payment}</span>. We will email
              you as soon as it clears, and your shirt goes to the printer the moment it does.
            </p>
          </>
        )}

        {!order.livemode && (
          <p className="notice" style={{ marginTop: 20 }}>
            This was a test-mode order: no money moved and no shirt will be printed.
          </p>
        )}

        <Link className="btn" href="/" style={{ textDecoration: 'none' }}>
          ♥ Get another shirt
        </Link>
      </div>
    </div>
  );
}

function Fulfillment({
  state,
  gaveUp,
}: {
  state: OrderResponse['fulfillment'];
  gaveUp: boolean;
}) {
  switch (state.status) {
    case 'placed':
      return (
        <p>
          It is with our printer as order <span className="order-id">{state.orderId}</span>.
          Expect it in about four business days.
        </p>
      );
    case 'failed':
      return (
        <div className="alert" role="alert">
          We took your payment but our printer rejected the order: {state.message} We have been
          alerted and will either fix it or refund you — no action needed from you.
        </div>
      );
    default:
      return gaveUp ? (
        <p className="notice">
          Your payment went through, but our printer is taking longer than usual to confirm.
          Your order is safe and we are retrying automatically — watch your inbox.
        </p>
      ) : (
        <p className="locked">
          <span className="spinner" style={{ borderColor: '#ccc', borderTopColor: '#337ab7' }} />{' '}
          Sending it to the printer…
        </p>
      );
  }
}
