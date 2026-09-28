'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { decodeDesign } from '@/lib/design';
import { COUNTRIES } from '@/data/countries';
import { PRICE_CENTS, SIZES, formatPrice, inkById, shirtById } from '@/lib/shirts';

const COUNTRY_LIST = Object.entries(COUNTRIES)
  .map(([code, name]) => ({ code, name }))
  .sort((a, b) => a.name.localeCompare(b.name));

export default function CheckoutForm() {
  const sp = useSearchParams();
  const d = sp.get('d') || '';
  const colorId = sp.get('color') || '';
  const inkId = sp.get('ink') || '';
  const size = (sp.get('size') || '').toLowerCase();
  const qty = Math.max(1, Math.min(5, parseInt(sp.get('qty') || '1', 10) || 1));

  const design = useMemo(() => decodeDesign(d), [d]);
  const shirt = shirtById(colorId);
  const ink = inkById(inkId);
  const sizeOk = (SIZES as readonly string[]).includes(size);
  const selectionOk = !!design && !!shirt && !!ink && sizeOk;

  const [form, setForm] = useState({
    name: '',
    email: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!selectionOk) {
    return (
      <div className="narrow">
        <h1 className="display">CHECKOUT</h1>
        <div className="notice-box">
          Your design link is incomplete.{' '}
          <Link href="/design" style={{ textDecoration: 'underline' }}>
            Start from the designer
          </Link>
          .
        </div>
      </div>
    );
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ d, color: colorId, ink: inkId, size, qty, recipient: form }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'checkout failed');
      window.location.assign(json.url);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  const previewUrl = `/api/design.png?d=${encodeURIComponent(d)}&ink=${encodeURIComponent(inkId)}&w=560`;

  return (
    <div className="narrow">
      <h1 className="display">SHIPPING &amp; PAYMENT</h1>
      <div className="two-col">
        <div className="summary-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="art" style={{ background: shirt!.hex }} src={previewUrl} alt="Your star map design" />
          <div className="body">
            <div>
              <b>{design!.title.toUpperCase()}</b>
            </div>
            <div>{design!.subtitle.toUpperCase()}</div>
            <div style={{ marginTop: 8 }}>
              {size.toUpperCase()} · {shirt!.name} · {ink!.name} ink · qty {qty}
            </div>
            <div style={{ marginTop: 8 }}>
              <b>{formatPrice(PRICE_CENTS * qty)}</b> · free standard shipping
            </div>
          </div>
        </div>

        <form onSubmit={submit}>
          <div className="panel">
            <div className="field">
              <label htmlFor="name">Full name</label>
              <input id="name" type="text" required value={form.name} onChange={set('name')} autoComplete="name" />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" required value={form.email} onChange={set('email')} autoComplete="email" />
            </div>
            <div className="field">
              <label htmlFor="line1">Address line 1</label>
              <input id="line1" type="text" required value={form.line1} onChange={set('line1')} autoComplete="address-line1" />
            </div>
            <div className="field">
              <label htmlFor="line2">Address line 2 (optional)</label>
              <input id="line2" type="text" value={form.line2} onChange={set('line2')} autoComplete="address-line2" />
            </div>
            <div className="row row-2">
              <div className="field">
                <label htmlFor="city">City</label>
                <input id="city" type="text" required value={form.city} onChange={set('city')} autoComplete="address-level2" />
              </div>
              <div className="field">
                <label htmlFor="state">State / county</label>
                <input id="state" type="text" value={form.state} onChange={set('state')} autoComplete="address-level1" />
              </div>
            </div>
            <div className="row row-2">
              <div className="field">
                <label htmlFor="zip">Postal / ZIP code</label>
                <input id="zip" type="text" required value={form.zip} onChange={set('zip')} autoComplete="postal-code" />
              </div>
              <div className="field">
                <label htmlFor="country">Country</label>
                <select id="country" value={form.country} onChange={set('country')}>
                  {COUNTRY_LIST.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {error && <div className="error-box">{error}</div>}

          <button type="submit" className="btn" style={{ width: '100%' }} disabled={busy}>
            {busy ? 'Opening secure checkout…' : `Pay ${formatPrice(PRICE_CENTS * qty)} with Stripe →`}
          </button>
          <p className="muted small" style={{ marginTop: 12, textAlign: 'center' }}>
            Your shirt is sent to print only after payment succeeds.
          </p>
        </form>
      </div>
    </div>
  );
}
