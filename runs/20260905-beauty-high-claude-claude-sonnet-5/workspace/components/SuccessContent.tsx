'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';

type OrderStatus = {
  paymentStatus: string;
  amountTotal: number | null;
  currency: string | null;
  customerEmail?: string;
  shippingName?: string;
  shippingAddress?: { line1?: string; city?: string; postal_code?: string; country?: string };
  fit?: string;
  color?: string;
  size?: string;
  theme?: string;
  artworkUrl?: string;
  prodigiOrderId?: string | null;
  prodigiStatus?: string | null;
  fulfillmentError?: string | null;
};

export function SuccessContent() {
  const params = useSearchParams();
  const sessionId = params.get('session_id');
  const [data, setData] = useState<OrderStatus | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const res = await fetch(`/api/order-status?session_id=${encodeURIComponent(sessionId!)}`);
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(json.error || 'Could not load order');
        setData(json);
        setFetchError(null);
        const settled = json.prodigiOrderId || json.fulfillmentError;
        if (!settled && attempts < 12) {
          timer = setTimeout(() => setAttempts((a) => a + 1), 2500);
        }
      } catch (err) {
        if (!cancelled) setFetchError(err instanceof Error ? err.message : 'Could not load order');
      }
    }
    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, attempts]);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-20 text-center">
      <div className="text-6xl">🎉</div>
      <h1 className="mt-6 font-display text-4xl font-black">
        That exact moment is now immortalized in cotton.
      </h1>
      <p className="mt-4 text-white/70">
        You should also receive an email receipt from Stripe shortly. Here&apos;s what we know
        so far:
      </p>

      {!sessionId && (
        <p className="mt-8 text-white/50">
          No order reference found. If you just checked out, refresh this page.
        </p>
      )}

      {sessionId && !data && !fetchError && (
        <p className="mt-8 animate-pulse text-white/50">Loading your order…</p>
      )}

      {fetchError && <p className="mt-8 text-red-300">{fetchError}</p>}

      {data && (
        <div className="mt-10 w-full rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-left">
          {data.artworkUrl && (
            <div className="mb-6 flex justify-center">
              <div className="relative h-48 w-40 overflow-hidden rounded-xl border border-white/10 shadow-lg">
                <Image src={data.artworkUrl} alt="Your frozen moment" fill className="object-cover" unoptimized />
              </div>
            </div>
          )}
          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            <dt className="text-white/50">Fit / color / size</dt>
            <dd className="text-right capitalize">
              {data.fit} · {data.color} · {data.size?.toUpperCase()}
            </dd>
            <dt className="text-white/50">Theme</dt>
            <dd className="text-right capitalize">{data.theme}</dd>
            <dt className="text-white/50">Total charged</dt>
            <dd className="text-right">
              {data.amountTotal != null
                ? `$${(data.amountTotal / 100).toFixed(2)} ${data.currency?.toUpperCase()}`
                : '—'}
            </dd>
            <dt className="text-white/50">Shipping to</dt>
            <dd className="text-right">
              {data.shippingName || '—'}
              <br />
              <span className="text-white/50">
                {[data.shippingAddress?.city, data.shippingAddress?.country].filter(Boolean).join(', ')}
              </span>
            </dd>
            <dt className="text-white/50">Fulfillment</dt>
            <dd className="text-right">
              {data.prodigiOrderId ? (
                <span className="text-candy-mint">✅ Sent to print — order {data.prodigiOrderId}</span>
              ) : data.fulfillmentError ? (
                <span className="text-red-300">⚠️ {data.fulfillmentError}</span>
              ) : (
                <span className="animate-pulse text-white/50">⏳ Queuing with the printer…</span>
              )}
            </dd>
          </dl>
        </div>
      )}

      <a
        href="/"
        className="mt-10 rounded-2xl bg-gradient-to-r from-candy-pink via-candy-lavender to-candy-gold px-8 py-3 font-bold text-dusk-950"
      >
        ✨ Freeze another moment
      </a>
    </main>
  );
}
