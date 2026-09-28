'use client';

// Sandbox test payment page. Mirrors the shape of a hosted payment page,
// but is clearly labelled: it exists only when Stripe is NOT configured,
// and it runs the exact same fulfilment pipeline a paid webhook would.

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { formatUSD } from '@/lib/format';
import { SHIPPING_PRICE_CENTS, SHIRT_PRICE_CENTS } from '@/lib/product';
import type { OrderPayload } from '@/lib/types';

function decodeToken(token: string): OrderPayload | null {
  try {
    const json = decodeURIComponent(
      Array.from(atob(token.replace(/-/g, '+').replace(/_/g, '/')))
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );
    return JSON.parse(json) as OrderPayload;
  } catch {
    return null;
  }
}

function PayInner() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const sig = params.get('sig') ?? '';
  const order = useMemo(() => decodeToken(token), [token]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token || !sig || !order) {
    return (
      <div className="panel p-10 text-center">
        <div className="font-display text-[18px] tracking-[0.18em] uppercase mb-3">
          Invalid payment link
        </div>
        <Link href="/#studio" className="nl-btn nl-btn-ghost mt-3">Back to the studio</Link>
      </div>
    );
  }

  const total = order.product.qty * SHIRT_PRICE_CENTS + SHIPPING_PRICE_CENTS;

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/payments/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, sig }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data?.error ?? 'Payment failed.');
        setBusy(false);
        return;
      }
      window.location.href = `/order/success?demo=1&ref=${encodeURIComponent(
        data.orderRef
      )}&token=${token}&sig=${sig}`;
    } catch {
      setError('Network error — please try again.');
      setBusy(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="banner-test rounded-xl px-4 py-3 text-[12px] tracked text-center">
        sandbox mode — no real charge
      </div>
      <div className="panel p-7">
        <div className="text-center mb-6">
          <div className="font-display tracking-[0.3em] uppercase text-[15px]">Nightloom</div>
          <div className="text-[11px] faint tracked mt-1">secure checkout · test mode</div>
        </div>
        <div className="rounded-xl border hairline bg-[rgba(4,6,18,0.5)] p-4 mb-6 text-[13px] space-y-1.5">
          <div className="flex justify-between muted">
            <span>Star map tee “{order.design.name}”</span>
            <span>
              {formatUSD(SHIRT_PRICE_CENTS)} × {order.product.qty}
            </span>
          </div>
          <div className="flex justify-between muted">
            <span>Standard shipping</span>
            <span>{formatUSD(SHIPPING_PRICE_CENTS)}</span>
          </div>
          <div className="flex justify-between text-[var(--ink)] pt-2 border-t hairline">
            <span>Total due</span>
            <span className="gold">{formatUSD(total)}</span>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <div className="nl-label">Card information</div>
            <input className="nl-input" value="4242 4242 4242 4242" readOnly />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="nl-label">Expiry</div>
              <input className="nl-input" value="12 / 34" readOnly />
            </div>
            <div>
              <div className="nl-label">CVC</div>
              <input className="nl-input" value="424" readOnly />
            </div>
          </div>
        </div>
        <button type="button" className="nl-btn nl-btn-primary w-full mt-6" onClick={pay} disabled={busy}>
          {busy ? 'Processing…' : `Pay ${formatUSD(total)} (test)`}
        </button>
        {error && (
          <div className="mt-4 rounded-xl border border-[rgba(255,157,157,0.4)] bg-[rgba(255,157,157,0.06)] px-4 py-3 text-[13px] text-[var(--danger)]">
            {error}
          </div>
        )}
        <p className="text-[11px] faint text-center mt-5 leading-relaxed">
          Stripe keys are not configured on this deployment, so this sandbox step stands in
          for the real payment. On success your order is submitted to the Prodigi print API
          (sandbox) exactly as a paid order would be.
        </p>
      </div>
    </div>
  );
}

export default function PayPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 md:px-8 pt-12 md:pt-20">
      <Suspense
        fallback={<div className="panel p-10 text-center faint text-[13px]">loading…</div>}
      >
        <PayInner />
      </Suspense>
    </div>
  );
}
