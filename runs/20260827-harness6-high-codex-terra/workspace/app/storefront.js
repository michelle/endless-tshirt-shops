'use client';

import { useEffect, useMemo, useState } from 'react';

const sizes = ['S', 'M', 'L', 'XL', '2XL'];

function formatStamp(value) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3,
    hour12: false, timeZoneName: 'short'
  }).format(new Date(Number(value)));
}

function Shirt({ stamp, fit }) {
  return <div className={`shirt-stage ${fit}`} aria-label="Live preview of a black t-shirt">
    <div className="shirt-shadow" />
    <svg className="tee" viewBox="0 0 420 470" aria-hidden="true">
      <path d="M116 61 62 85 13 169l72 45 35-54v268c0 16 14 29 30 29h120c16 0 30-13 30-29V160l35 54 72-45-49-84-54-24c-15 35-45 48-94 48s-79-13-94-48Z" fill="#111114"/>
      <path d="M116 61c14 35 45 48 94 48s79-13 94-48" fill="none" stroke="#2e2e34" strokeWidth="3"/>
      <path d="M62 85 13 169l72 45m273-129 49 84-72 45" fill="none" stroke="#2a2a2e" strokeWidth="4"/>
    </svg>
    <div className="shirt-print"><span>{stamp}</span></div>
  </div>;
}

export default function Storefront() {
  const [now, setNow] = useState(Date.now());
  const [size, setSize] = useState('M');
  const [fit, setFit] = useState('unisex');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 37); return () => clearInterval(id); }, []);
  const stamp = useMemo(() => String(now), [now]);
  async function checkout() {
    setPending(true); setError('');
    try {
      const res = await fetch('/api/checkout', { method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({stamp, size, fit}) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'We could not start checkout.');
      window.location.assign(data.url);
    } catch (e) { setError(e.message); setPending(false); }
  }
  return <main>
    <div className="grain" />
    <header><a className="brand" href="/">datetime.store</a><span className="header-note">one moment, made wearable</span></header>
    <section className="hero">
      <div className="copy">
        <p className="eyebrow">A very specific souvenir</p>
        <h1>Wear the exact<br/><em>moment</em> you said yes.</h1>
        <p className="lede">This shirt is printed with the millisecond you make it yours. There will never be another one like it.</p>
        <div className="live-readout"><span>LIVE TIMESTAMP</span><strong>{stamp}</strong><small>{formatStamp(stamp)}</small></div>
      </div>
      <Shirt stamp={stamp} fit={fit}/>
    </section>
    <section className="buy-card" aria-label="Customize your shirt">
      <div className="product-summary"><span className="dot" /> Black Bella+Canvas {fit === 'unisex' ? '3001' : '6004'} <span>·</span> <strong>$29.00</strong><small>Free US standard shipping</small></div>
      <div className="options">
        <fieldset><legend>Fit</legend><div className="segmented">{[['unisex', 'Unisex'], ['fitted', 'Tailored']].map(([value,label]) => <button type="button" onClick={() => setFit(value)} className={fit === value ? 'selected' : ''} key={value}>{label}</button>)}</div></fieldset>
        <fieldset><legend>Size</legend><div className="sizes">{sizes.map(value => <button type="button" onClick={() => setSize(value)} className={size === value ? 'selected' : ''} key={value}>{value}</button>)}</div></fieldset>
        <button className="checkout" onClick={checkout} disabled={pending}>{pending ? 'Opening secure checkout…' : 'Freeze this moment — $29.00'} <span>→</span></button>
        {error && <p className="error" role="alert">{error}</p>}
      </div>
      <p className="fineprint">Secure checkout by Stripe · Printed on demand by Prodigi · Made only after you order</p>
    </section>
    <section className="details"><article><b>01</b><h2>Your timestamp</h2><p>We lock the live timestamp when you check out, down to the millisecond.</p></article><article><b>02</b><h2>Printed for you</h2><p>Your number is printed in soft white ink on a premium black cotton tee.</p></article><article><b>03</b><h2>Sent your way</h2><p>Made to order and dispatched directly to your door. Usually 3–7 business days.</p></article></section>
    <footer><span>© {new Date().getFullYear()} datetime.store</span><span>Every second counts.</span></footer>
  </main>;
}
