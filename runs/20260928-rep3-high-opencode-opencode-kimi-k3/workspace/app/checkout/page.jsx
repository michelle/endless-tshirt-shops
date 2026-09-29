'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BASE_PRICE_CENTS, shippingCents, money, colorById } from '../../lib/design';
import { encodeDesign } from '../../lib/params';
import { COUNTRIES } from '../../lib/countries';

const F = (v) => v || '';

export default function CheckoutPage() {
  const router = useRouter();
  const [order, setOrder] = useState(undefined); // undefined=loading, null=missing
  const [form, setForm] = useState({ email: '', name: '', line1: '', line2: '', city: '', state: '', zip: '', country: 'US' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('celestee:order');
      setOrder(raw ? JSON.parse(raw) : null);
    } catch {
      setOrder(null);
    }
  }, []);

  const ship = useMemo(() => shippingCents(form.country), [form.country]);
  const total = BASE_PRICE_CENTS + ship;

  if (order === undefined) return <div className="narrow muted">Loading…</div>;
  if (order === null) {
    return (
      <div className="narrow">
        <h1 className="serif" style={{ fontSize: 34 }}>Nothing to check out yet</h1>
        <p className="muted" style={{ margin: '14px 0 22px' }}>Design your sky first — it takes about a minute.</p>
        <a className="btn" href="/create">Design my shirt</a>
      </div>
    );
  }

  const { design, color, size } = order;
  const colorObj = colorById(color);
  const previewUrl = `/api/artwork?${encodeDesign(design)}&res=preview`;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ design, color, size, customer: form }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Checkout failed');
      window.location.href = json.url; // to Stripe's hosted checkout
    } catch (e2) {
      setErr(e2.message);
      setBusy(false);
    }
  };

  return (
    <div className="narrow">
      <div className="eyebrow">Almost there</div>
      <h1 className="serif" style={{ fontSize: 36, fontWeight: 500 }}>Checkout</h1>

      <div className="order-summary">
        <img src={previewUrl} alt="Your star map artwork" width={120} height={149} />
        <div>
          <div className="serif" style={{ fontSize: 21 }}>“{design.line1 || 'Written in the Stars'}”</div>
          <div className="muted small">{design.when} · {design.place}</div>
          <div className="muted small">Star Map Tee — {colorObj?.label}, size {size}</div>
          <div style={{ marginTop: 6 }}>
            <a className="linklike" href="/create" onClick={() => sessionStorage.removeItem('celestee:order')}>edit design</a>
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="form-grid">
        <div className="field span2">
          <label>Email</label>
          <input className="input" type="email" required value={form.email} onChange={set('email')} placeholder="you@example.com" />
        </div>
        <div className="field span2">
          <label>Full name</label>
          <input className="input" required value={form.name} onChange={set('name')} placeholder="Alex Rivera" />
        </div>
        <div className="field span2">
          <label>Address line 1</label>
          <input className="input" required value={form.line1} onChange={set('line1')} placeholder="123 Milky Way" />
        </div>
        <div className="field span2">
          <label>Address line 2 (optional)</label>
          <input className="input" value={form.line2} onChange={set('line2')} placeholder="Apt 4" />
        </div>
        <div className="field">
          <label>City</label>
          <input className="input" required value={form.city} onChange={set('city')} />
        </div>
        <div className="field">
          <label>State / region</label>
          <input className="input" value={form.state} onChange={set('state')} />
        </div>
        <div className="field">
          <label>ZIP / postal code</label>
          <input className="input" required value={form.zip} onChange={set('zip')} />
        </div>
        <div className="field">
          <label>Country</label>
          <select className="input" value={form.country} onChange={set('country')}>
            {COUNTRIES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
          </select>
        </div>

        <div className="span2 totals">
          <div className="row"><span>Star Map Tee ({colorObj?.label} · {size})</span><span>{money(BASE_PRICE_CENTS)}</span></div>
          <div className="row"><span>Standard shipping</span><span>{money(ship)}</span></div>
          <div className="row grand"><span>Total</span><span>{money(total)}</span></div>
        </div>

        {err && <div className="error-box span2">{err}</div>}

        <div className="span2">
          <button className="btn" style={{ width: '100%', justifyContent: 'center' }} disabled={busy}>
            {busy ? 'Opening secure checkout…' : `Pay ${money(total)} — secure checkout`}
          </button>
          <p className="hint" style={{ marginTop: 10 }}>
            Payment by card, Apple Pay or Google Pay via Stripe. Your shirt is only sent to print after payment succeeds.
          </p>
        </div>
      </form>
    </div>
  );
}
