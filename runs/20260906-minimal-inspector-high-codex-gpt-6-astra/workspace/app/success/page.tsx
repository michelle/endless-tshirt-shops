'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, ArrowRight } from 'lucide-react';
import { Header, Footer } from '@/components/chrome';
type Order = {
  paid: boolean;
  status: string;
  timestamp?: string;
  fit?: string;
  size?: string;
  orderId?: string;
  sandbox?: boolean;
};
export default function Success() {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const id = new URLSearchParams(location.search).get('session_id');
    if (!id) {
      const frame = requestAnimationFrame(() =>
        setError('This order link is missing its checkout reference.'),
      );
      return () => cancelAnimationFrame(frame);
    }
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let polls = 0;
    async function load() {
      try {
        const r = await fetch('/api/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: id }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        if (stopped) return;
        setOrder(d);
        setError('');
        if ((!d.paid || d.status === 'pending') && polls++ < 8)
          timer = setTimeout(load, 5000);
      } catch (e) {
        if (!stopped)
          setError(
            e instanceof Error
              ? e.message
              : 'Could not load this order. Please try again.',
          );
      }
    }
    void load();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [retry]);
  return (
    <>
      <Header />
      <main className="result-page">
        {order?.paid ? (
          <CheckCircle2 className="result-icon" size={43} strokeWidth={1.3} />
        ) : (
          <Clock3 className="result-icon" size={43} strokeWidth={1.3} />
        )}
        <div className="eyebrow mono">
          {order?.sandbox ? 'TEST ORDER' : 'YOUR MOMENT'}
        </div>
        <h1>
          {order?.paid
            ? 'A moment, kept.'
            : error
              ? 'Let’s find your moment.'
              : 'Checking your moment…'}
        </h1>
        {error ? (
          <>
            <p role="alert">{error}</p>
            <button
              className="text-button"
              onClick={() => setRetry((v) => v + 1)}
            >
              Try again
            </button>
          </>
        ) : !order ? (
          <p aria-live="polite">
            Confirming your payment and preparing your tee.
          </p>
        ) : !order.paid ? (
          <p aria-live="polite">
            {order.status === 'expired'
              ? 'This checkout has expired. Return to the store to capture a new moment.'
              : 'Payment hasn’t completed yet. Finish your Stripe checkout, then return here.'}
          </p>
        ) : (
          <>
            <p>
              Your payment is confirmed. These are the exact digits on your tee.
            </p>
            <div className="result-card">
              <div className="mini-title mono">YOUR UNIX TIMESTAMP</div>
              <div className="result-number mono">{order.timestamp}</div>
              <p>{new Date(Number(order.timestamp)).toUTCString()}</p>
              <div className="result-line">
                <span>The datetime tee</span>
                <span>
                  {order.fit} / {order.size} / Black
                </span>
              </div>
              <div className="result-line">
                <span>Total · USD</span>
                <span>$22.50</span>
              </div>
              <div className="result-line">
                <span>Printing</span>
                <span>
                  {order.status === 'pending'
                    ? 'Preparing order'
                    : order.status === 'needs_attention'
                      ? 'Needs review'
                      : order.orderId
                        ? 'Order received by Prodigi'
                        : 'Preparing order'}
                </span>
              </div>
              {order.orderId && (
                <div className="result-line">
                  <span>Order reference</span>
                  <span
                    className="mono"
                    style={{ overflowWrap: 'anywhere', textAlign: 'right' }}
                  >
                    {order.orderId}
                  </span>
                </div>
              )}
            </div>
            {order.status === 'pending' && (
              <p aria-live="polite">
                Payment is safe. Your print order is still being prepared; we’ll
                retry automatically. Save this page to check its progress.
              </p>
            )}
            {order.status === 'needs_attention' && (
              <p aria-live="polite">
                Prodigi received the order and flagged an issue for the store
                owner to review. Please keep your order reference.
              </p>
            )}
            {order.sandbox && (
              <p>
                This was a test payment and a sandbox print order. No money was
                charged and nothing will be shipped.
              </p>
            )}
          </>
        )}
        <Link
          className="buy-button"
          style={{ marginTop: 30, gap: 15 }}
          href="/"
        >
          Capture another moment <ArrowRight size={17} />
        </Link>
      </main>
      <Footer />
    </>
  );
}
