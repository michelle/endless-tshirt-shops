'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Tee from '@/components/Tee';
import { useCart } from '@/components/CartProvider';
import { cartSubtotalCents } from '@/lib/cart';
import { SIZE_LABEL, getColor, getDesign, money, unitPriceCents } from '@/lib/catalog';

function Cancelled() {
  const params = useSearchParams();
  if (!params.get('cancelled')) return null;
  return <div className="notice">Checkout cancelled — nothing has been charged. Your cart is still here.</div>;
}

export default function CartView() {
  const { lines, ready, setQty, remove } = useCart();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkout() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: lines }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Could not start checkout.');
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start checkout.');
      setBusy(false);
    }
  }

  if (!ready) return <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>;

  if (lines.length === 0) {
    return (
      <>
        <Suspense fallback={null}><Cancelled /></Suspense>
        <p style={{ color: 'var(--ink-soft)' }}>Your cart is empty.</p>
        <Link href="/#shirts" className="btn btn-ink" style={{ marginTop: 14 }}>Browse the register</Link>
      </>
    );
  }

  const subtotal = cartSubtotalCents(lines);

  return (
    <>
      <Suspense fallback={null}><Cancelled /></Suspense>

      {lines.map((l, i) => {
        const d = getDesign(l.slug);
        const c = getColor(l.color);
        if (!d || !c) return null;
        return (
          <div className="cart-line" key={`${l.slug}-${l.color}-${l.size}-${i}`}>
            <Link href={`/shirt/${l.slug}`} className="thumb"><Tee slug={l.slug} colorId={l.color} /></Link>
            <div>
              <div className="card-title" style={{ fontSize: 19 }}>
                <Link href={`/shirt/${l.slug}`}>{d.trade}</Link>
              </div>
              <div className="card-meta">{c.name} · {SIZE_LABEL[l.size]} · {money(unitPriceCents(l.size))} each</div>
              <div className="qty" style={{ marginTop: 10, width: 'fit-content' }}>
                <button onClick={() => setQty(i, l.qty - 1)} aria-label="Decrease">−</button>
                <span>{l.qty}</span>
                <button onClick={() => setQty(i, l.qty + 1)} aria-label="Increase">+</button>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontVariantNumeric: 'tabular-nums' }}>{money(unitPriceCents(l.size) * l.qty)}</div>
              <button className="link-x" style={{ marginTop: 8 }} onClick={() => remove(i)}>Remove</button>
            </div>
          </div>
        );
      })}

      <div className="cart-sum">
        <div className="cart-sum-row"><span>Subtotal</span><span>{money(subtotal)}</span></div>
        <div className="cart-sum-row"><span>Shipping</span><span>Free</span></div>
        <div className="cart-sum-row"><span>Taxes &amp; duties</span><span style={{ color: 'var(--ink-soft)' }}>Calculated at checkout</span></div>
        <div className="cart-sum-row total"><span>Total</span><span>{money(subtotal)}</span></div>
      </div>

      {error && <div className="notice bad">{error}</div>}

      <button className="btn btn-ink" style={{ width: '100%', marginTop: 22 }} onClick={checkout} disabled={busy}>
        {busy ? 'Opening secure checkout…' : 'Checkout'}
      </button>
      <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 12, textAlign: 'center' }}>
        Payment is handled by Stripe. Shirts are printed after payment clears.
      </p>
    </>
  );
}
