'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface OrderStatus {
  status: 'unpaid' | 'pending' | 'ordered' | 'failed';
  orderId?: string | null;
  error?: string | null;
  style?: string;
  size?: string;
  email?: string;
}

function SuccessContent() {
  const params = useSearchParams();
  const sessionId = params.get('session_id');
  const [data, setData] = useState<OrderStatus | null>(null);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/order-status?session_id=${encodeURIComponent(sessionId)}`);
        const payload = await res.json();
        if (!cancelled) setData(payload);
      } catch {
        // ignore, will retry
      }
    };

    poll();
    const interval = setInterval(() => {
      setAttempts((a) => {
        const next = a + 1;
        if (next > 20) clearInterval(interval);
        return next;
      });
      setData((current) => {
        if (current?.status === 'ordered' || current?.status === 'failed') {
          clearInterval(interval);
          return current;
        }
        poll();
        return current;
      });
    }, 2500);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [sessionId]);

  if (!sessionId) {
    return (
      <p className="text-white/70">
        Missing checkout session. <Link href="/" className="underline">Go back home</Link>.
      </p>
    );
  }

  const status = data?.status;
  const stillWorking = !status || status === 'pending' || status === 'unpaid';

  return (
    <div className="w-full max-w-md text-center">
      <div className="mb-6 text-5xl">{status === 'ordered' ? '👕' : status === 'failed' ? '⚠️' : '⏳'}</div>
      <h1 className="text-2xl font-bold">
        {status === 'ordered' && 'Congrats on your pretty cool shirt!'}
        {status === 'failed' && 'We hit a snag fulfilling your order'}
        {stillWorking && 'Payment confirmed — printing your moment…'}
      </h1>
      <p className="mt-3 text-white/60">
        {status === 'ordered' &&
          `Your shirt is on its way to production${data?.orderId ? ` (order ${data.orderId})` : ''}. A receipt was sent${
            data?.email ? ` to ${data.email}` : ''
          }.`}
        {status === 'failed' &&
          (data?.error ||
            'Your payment succeeded but we could not submit the print order automatically. Our team will follow up to complete fulfillment.')}
        {stillWorking &&
          'Your payment went through and we are sending your exact moment to the printer. This usually takes a few seconds.'}
      </p>
      {stillWorking && attempts > 12 && (
        <p className="mt-3 text-sm text-white/40">
          Still working on it — you can safely close this page, a confirmation email is on its way.
        </p>
      )}
      <Link
        href="/"
        className="mt-8 inline-block rounded-lg border border-white/20 px-5 py-2 text-sm text-white/80 hover:border-white/40"
      >
        Get another shirt
      </Link>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-24">
      <Suspense fallback={<p className="text-white/70">Loading…</p>}>
        <SuccessContent />
      </Suspense>
    </main>
  );
}
