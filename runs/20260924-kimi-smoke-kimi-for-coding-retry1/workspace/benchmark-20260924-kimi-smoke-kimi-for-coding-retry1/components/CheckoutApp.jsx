'use client';

import { useEffect, useMemo, useState } from 'react';
import CartThumb from '@/components/CartThumb';
import { priceOrder, usd } from '@/lib/pricing';

export default function CheckoutApp({ mode }) {
  const [cart, setCart] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ name: '', email: '', line1: '', line2: '', city: '', state: '', zip: '', country: 'US' });
  const [paid, setPaid] = useState(null);

  useEffect(() => {
    try {
      setCart(JSON.parse(localStorage.getItem('skywriter_cart') || '[]'));
    } catch {
      setCart([]);
    }
  }, []);

  const totals = useMemo(
    () => (cart ? priceOrder(cart.map((i) => ({ qty: i.design.qty }))) : null),
    [cart]
  );

  if (cart === null) return <div className="page">Loading…</div>;
  if (cart.length === 0 && !paid) {
    return (
      <div className="page">
        <h1>Your cart is empty</h1>
        <p className="lead">Chart a sky first — it only takes a minute.</p>
        <a className="btn" href="/#customize">Create your shirt</a>
      </div>
    );
  }

  const patch = (p) => setForm((f) => ({ ...f, ...p }));

  async function pay() {
    setBusy(true);
    setErr('');
    try {
      const payload = { items: cart.map((i) => ({ design: i.design })) };
      if (mode === 'sandbox') {
        payload.shipping = form;
        const res = await fetch('/api/pay/sandbox', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'payment failed');
        setPaid(data);
        localStorage.removeItem('skywriter_cart');
        window.__swRefreshCart && window.__swRefreshCart();
        window.location.href = `/success?ref=${data.ref}`;
      } else if (mode === 'stripe') {
        const res = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'could not start checkout');
        window.location.href = data.url; // Stripe-hosted checkout
      } else {
        throw new Error('Payments are not configured on this deployment.');
      }
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <h1>Checkout</h1>
      <p className="lead">Your shirts are printed to order — review the designs, then pay.</p>

      {mode === 'sandbox' && (
        <div className="paymode">
          <b>Sandbox mode</b> — no Stripe keys are configured on this deployment, so checkout runs a
          simulated payment to demonstrate the full order pipeline. No card is charged; the Prodigi
          order is placed in their sandbox (nothing is printed).
        </div>
      )}
      {mode === 'stripe' && (
        <div className="paymode" style={{ borderColor: 'rgba(120,200,140,0.5)', color: '#b9e8c5', background: 'rgba(120,200,140,0.07)' }}>
          Payments secured by Stripe — you’ll enter your card and shipping address on Stripe’s hosted checkout.
        </div>
      )}

      <div className="cartgrid">
        <div className="panel">
          {cart.map((item) => (
            <div className="cartitem" key={item.id}>
              <CartThumb design={item.design} />
              <div className="meta">
                <b>{item.design.place || 'CUSTOM SKY'}</b>
                {item.design.date} · {item.design.time} ({item.design.tz})<br />
                {item.design.msg ? <>“{item.design.msg}”<br /></> : null}
                {item.design.color} · size {item.design.size}
              </div>
              <div className="actions">
                <div className="qty">× {item.design.qty}</div>
                <div>{usd(item.design.qty * 3499)}</div>
                <button type="button" onClick={() => {
                  const next = cart.filter((c) => c.id !== item.id);
                  setCart(next);
                  localStorage.setItem('skywriter_cart', JSON.stringify(next));
                  window.__swRefreshCart && window.__swRefreshCart();
                }}>remove</button>
              </div>
            </div>
          ))}
          {totals && (
            <div className="totals">
              <div><span>Subtotal ({totals.units} {totals.units === 1 ? 'shirt' : 'shirts'})</span><span>{usd(totals.subtotalCents)}</span></div>
              <div><span>Shipping</span><span>{totals.shippingCents === 0 ? 'Free' : usd(totals.shippingCents)}</span></div>
              <div className="grand"><span>Total</span><span>{usd(totals.totalCents)}</span></div>
            </div>
          )}
        </div>

        <div className="panel">
          {mode === 'sandbox' ? (
            <>
              <h2>Shipping address</h2>
              <p className="hint">Where should the print lab send it?</p>
              <div className="field"><label>Name</label><input type="text" value={form.name} onChange={(e) => patch({ name: e.target.value })} /></div>
              <div className="field"><label>Email</label><input type="email" value={form.email} onChange={(e) => patch({ email: e.target.value })} /></div>
              <div className="field"><label>Address line 1</label><input type="text" value={form.line1} onChange={(e) => patch({ line1: e.target.value })} /></div>
              <div className="field"><label>Address line 2</label><input type="text" value={form.line2} onChange={(e) => patch({ line2: e.target.value })} /></div>
              <div className="row">
                <div className="field"><label>City</label><input type="text" value={form.city} onChange={(e) => patch({ city: e.target.value })} /></div>
                <div className="field"><label>State</label><input type="text" value={form.state} onChange={(e) => patch({ state: e.target.value })} /></div>
              </div>
              <div className="row">
                <div className="field"><label>ZIP</label><input type="text" value={form.zip} onChange={(e) => patch({ zip: e.target.value })} /></div>
                <div className="field"><label>Country</label>
                  <select value={form.country} onChange={(e) => patch({ country: e.target.value })}>
                    {['US', 'CA', 'GB', 'DE', 'FR', 'AU', 'NL', 'SE', 'JP', 'IE', 'ES', 'IT', 'NZ'].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </>
          ) : (
            <h2>Payment</h2>
          )}

          {err && <div className="err">{err}</div>}

          <button className="btn" onClick={pay} disabled={busy || cart.length === 0} style={{ width: '100%' }}>
            {busy ? 'Processing…' : mode === 'sandbox'
              ? `Pay ${totals ? usd(totals.totalCents) : ''} (sandbox — no charge)`
              : `Pay ${totals ? usd(totals.totalCents) : ''} with card`}
          </button>
          <p className="hint" style={{ marginTop: 12 }}>
            Your shirt is sent to the printer only after your payment succeeds.
          </p>
        </div>
      </div>
    </div>
  );
}
