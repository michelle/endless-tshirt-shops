'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface OrderState {
  sessionId: string;
  paymentStatus: string;
  timestamp: string | null;
  style: string | null;
  size: string | null;
  prodigiOrderId: string | null;
  prodigiOrderStatus: string | null;
  error: string | null;
}

const POLL_INTERVAL_MS = 4000;
const MAX_POLLS = 20;

function SuccessInner() {
  const params = useSearchParams();
  const sessionId = params.get('session_id');
  const [order, setOrder] = useState<OrderState | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    let polls = 0;
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;

    const poll = async () => {
      polls += 1;
      try {
        const res = await fetch(
          `/api/order-status?session_id=${encodeURIComponent(sessionId)}`
        );
        const payload = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(payload.error);
        setOrder(payload);
        if (payload.prodigiOrderId || polls >= MAX_POLLS) return;
      } catch {
        if (cancelled) return;
        if (polls >= MAX_POLLS) {
          setFailed(true);
          return;
        }
      }
      timer = setTimeout(poll, POLL_INTERVAL_MS);
    };

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [sessionId]);

  if (!sessionId) {
    return (
      <div className="Success">
        <h2>Hmm, no order here.</h2>
        <Link className="again" href="/">
          Go get a shirt
        </Link>
      </div>
    );
  }

  const paid = order?.paymentStatus === 'paid';
  const when =
    order?.timestamp && !Number.isNaN(Number(order.timestamp))
      ? new Date(Number(order.timestamp)).toUTCString()
      : null;

  return (
    <div className="Success">
      <h2>
        {order === null
          ? 'Checking on your moment…'
          : paid
            ? 'Congrats on your pretty cool shirt! 🎉'
            : 'Payment still processing…'}
      </h2>

      {order?.timestamp && (
        <>
          <div className="Success-ts">{order.timestamp}</div>
          <p className="Success-detail">
            {when && <>That’s {when} — </>}
            yours forever, in white ink on a black{' '}
            {order.style === 'fitted' ? 'fitted' : 'unisex'} tee, size{' '}
            {order.size}.
          </p>
        </>
      )}

      {paid && (
        <p>
          You’ll get an email receipt shortly, and your shirt is off to the
          printers.
        </p>
      )}

      <div className="Success-order">
        {order?.prodigiOrderId ? (
          <>
            Print order placed: <code>{order.prodigiOrderId}</code>
            {order.prodigiOrderStatus && <> · {order.prodigiOrderStatus}</>}
          </>
        ) : failed ? (
          <>
            We’ve received your payment — your print order is queued and will
            be confirmed by email.
          </>
        ) : (
          <>
            <span className="spinner" aria-hidden="true" />
            Sending your moment to the printers…
          </>
        )}
      </div>

      <Link className="again" href="/">
        ❤ Get another shirt
      </Link>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <div className="container">
      <header className="page-header">
        <h1>datetime.store</h1>
        <div className="tagline">
          we sell a t-shirt with the current datetime.{' '}
          <span aria-hidden="true">⏱</span>
        </div>
      </header>
      <Suspense fallback={null}>
        <SuccessInner />
      </Suspense>
    </div>
  );
}
