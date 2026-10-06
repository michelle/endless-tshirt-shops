'use client';

import { useState } from 'react';

export default function DemoCheckoutForm({ token }) {
  const [f, setF] = useState({ name: 'Riley Tester', email: 'riley@example.com', phone: '', line1: '123 Main Street', line2: '', city: 'Springfield', state: 'IL', postalCode: '62701' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const on = (k) => (e) => setF((c) => ({ ...c, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { name, email, phone, ...address } = f;
      const res = await fetch('/api/demo/pay', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, name, email, phone, address }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Something went wrong.');
      window.location.href = json.url;
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <label className="f" htmlFor="name">Full name</label>
      <input id="name" type="text" required value={f.name} onChange={on('name')} />
      <div className="row">
        <div><label className="f" htmlFor="email">Email</label><input id="email" type="email" required value={f.email} onChange={on('email')} /></div>
        <div><label className="f" htmlFor="phone">Phone (optional)</label><input id="phone" type="tel" value={f.phone} onChange={on('phone')} /></div>
      </div>
      <label className="f" htmlFor="line1">Address</label>
      <input id="line1" type="text" required value={f.line1} onChange={on('line1')} />
      <input type="text" style={{ marginTop: 8 }} aria-label="Address line 2" placeholder="Apartment, suite (optional)" value={f.line2} onChange={on('line2')} />
      <div className="row">
        <div><label className="f" htmlFor="city">City</label><input id="city" type="text" required value={f.city} onChange={on('city')} /></div>
        <div><label className="f" htmlFor="state">State / region</label><input id="state" type="text" value={f.state} onChange={on('state')} /></div>
      </div>
      <label className="f" htmlFor="zip">Postal / ZIP code</label>
      <input id="zip" type="text" required value={f.postalCode} onChange={on('postalCode')} />
      <div className="demo-banner" style={{ marginTop: 18 }}>No card details are collected here. Pressing the button below simulates a successful payment and sends the order to Prodigi’s <strong>sandbox</strong>.</div>
      <button className="btn" style={{ width: '100%' }} disabled={busy}>{busy ? 'Placing order…' : 'Simulate payment & place order'}</button>
      {error && <p className="err" role="alert">{error}</p>}
    </form>
  );
}
