'use client';

import { useEffect, useState } from 'react';

type OrderState = {
  status: 'loading' | 'pending' | 'fulfilled' | 'error';
  orderId?: string;
  timestamp?: string;
  fit?: string;
  size?: string;
  message?: string;
};

export function SuccessReceipt({ sessionId }: { sessionId: string }) {
  const [order, setOrder] = useState<OrderState>({ status: sessionId ? 'loading' : 'error', message: sessionId ? undefined : 'This receipt has no time attached to it.' });

  useEffect(() => {
    if (!sessionId) return;
    let stopped = false;
    let attempts = 0;

    async function checkOrder() {
      attempts += 1;
      try {
        const response = await fetch(`/api/order?session_id=${encodeURIComponent(sessionId)}`, { cache: 'no-store' });
        const data = (await response.json()) as OrderState;
        if (stopped) return;
        setOrder(data);
        if (data.status === 'pending' && attempts < 8) window.setTimeout(checkOrder, 1500);
      } catch {
        if (!stopped) setOrder({ status: 'error', message: 'The receipt printer is thinking extremely hard.' });
      }
    }

    void checkOrder();
    return () => { stopped = true; };
  }, [sessionId]);

  const done = order.status === 'fulfilled';
  return (
    <main className="success-page">
      <a className="brand" href="/">datetime<span>.store</span></a>
      <section className="success-card">
        <div className={done ? 'success-burst done' : 'success-burst'} aria-hidden="true">{done ? '✓' : '…'}</div>
        <p className="eyebrow">{done ? 'Chronology purchased' : order.status === 'error' ? 'Tiny wrinkle in time' : 'Freezing your moment'}</p>
        <h1>{done ? 'Congrats on your pretty cool shirt.' : order.status === 'error' ? 'Your payment made it. Your shirt needs a nudge.' : 'The machines are discussing your millisecond.'}</h1>

        {done ? (
          <>
            <div className="moment-number">{order.timestamp}</div>
            <div className="success-details">
              <div><span>Fit</span><strong>{order.fit}</strong></div>
              <div><span>Size</span><strong>{order.size}</strong></div>
              <div><span>Prodigi sandbox order</span><strong>{order.orderId}</strong></div>
            </div>
            <p>Your test payment is complete and the sandbox fulfillment order exists. No actual shirt will be harmed.</p>
          </>
        ) : (
          <p>{order.message || 'This usually takes a few seconds. Time is famously difficult.'}</p>
        )}

        <a className="buy-button success-link" href="/"><span>BUY ANOTHER MOMENT</span><span aria-hidden="true">↺</span></a>
      </section>
    </main>
  );
}
