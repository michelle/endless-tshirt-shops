'use client';

import { useEffect, useState } from 'react';

type OrderStatus = {
  paid: boolean;
  paymentStatus?: string;
  orderId?: string | null;
  outcome?: string;
  error?: string;
  seedText?: string | null;
  style?: string | null;
};

export function SuccessClient({ sessionId }: { sessionId: string }) {
  const [status, setStatus] = useState<OrderStatus | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    async function poll() {
      attempts += 1;
      try {
        const res = await fetch(`/api/order-status?session_id=${encodeURIComponent(sessionId)}`);
        const data = await res.json();
        if (cancelled) return;
        setStatus(data);
        if (!data.paid && attempts < 8) {
          setTimeout(poll, 1500);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    }
    poll();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (failed) {
    return <p className="text-red-400">Couldn't check your order status. Refresh to try again.</p>;
  }

  if (!status) {
    return <p className="text-neutral-400">Confirming your payment…</p>;
  }

  if (!status.paid) {
    return (
      <p className="text-neutral-400">
        Payment status: <span className="text-white">{status.paymentStatus}</span>. This page
        will update automatically once it clears.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-neutral-200">
        Payment confirmed for seed <span className="text-white">"{status.seedText}"</span> (
        {status.style} pattern).
      </p>
      {status.orderId ? (
        <p className="text-neutral-400 text-sm">
          Print order placed with our production partner — reference{' '}
          <span className="text-white">{status.orderId}</span>. You'll get a shipping
          confirmation by email once it's on its way.
        </p>
      ) : status.error ? (
        <p className="text-amber-400 text-sm">
          Payment succeeded, but we hit a snag queuing production ({status.error}). Our team has
          been notified — no need to re-order.
        </p>
      ) : (
        <p className="text-neutral-400 text-sm">Queuing your shirt for production…</p>
      )}
    </div>
  );
}
