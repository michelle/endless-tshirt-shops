'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type Style = 'fitted' | 'unisex';
const SIZES = ['S', 'M', 'L', 'XL', '2XL'];

function formatTime(ms: number) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'medium' }).format(ms);
}

function Shirt({ stamp, style }: { stamp: number; style: Style }) {
  const time = Math.floor(stamp / 1000);
  return <div className="shirt-stage" aria-label="Black timestamp shirt preview">
    <div className={`shirt ${style}`}>
      <div className="collar" />
      <div className="timestamp">{time}</div>
      <div className="shirt-note">your moment, printed</div>
    </div>
    <div className="preview-caption"><span className="pulse" /> Live timestamp preview</div>
  </div>;
}

export default function Home() {
  const [stamp, setStamp] = useState(() => Date.now());
  const [style, setStyle] = useState<Style>('unisex');
  const [size, setSize] = useState('M');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { const timer = window.setInterval(() => setStamp(Date.now()), 250); return () => clearInterval(timer); }, []);
  const price = useMemo(() => '$22.50', []);

  async function startCheckout(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError('');
    try {
      const response = await fetch('/api/checkout', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ style, size, timestamp: Date.now() }) });
      const payload = await response.json();
      if (!response.ok || !payload.url) throw new Error(payload.error || 'Checkout could not be started.');
      window.location.assign(payload.url);
    } catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong.'); setLoading(false); }
  }

  return <main>
    <nav><a className="wordmark" href="/">datetime<span>.store</span></a><span className="nav-note">A physical receipt for right now.</span></nav>
    <section className="hero">
      <div className="story"><p className="eyebrow">ONE MOMENT. ONE SHIRT.</p><h1>Wear the exact<br /><em>time</em> you chose.</h1><p className="intro">A black tee, made to order, with the Unix timestamp from the instant you check out. No repeats. No take-backs.</p><div className="moment"><span>RIGHT NOW</span><strong>{formatTime(stamp)}</strong></div></div>
      <Shirt stamp={stamp} style={style} />
    </section>
    <section className="order-wrap" id="order"><div className="order-copy"><p className="eyebrow">MAKE IT YOURS</p><h2>Capture this one.</h2><p>Printed in white on a soft black tee. Shipping is included in the price.</p><ul><li>Made only after you order</li><li>Free standard shipping</li><li>Secure checkout by Stripe</li></ul></div>
      <form className="picker" onSubmit={startCheckout}>
        <fieldset><legend>Fit</legend><div className="option-row"><button type="button" onClick={() => setStyle('unisex')} className={style === 'unisex' ? 'selected' : ''}><b>Unisex</b><small>Classic, relaxed fit</small></button><button type="button" onClick={() => setStyle('fitted')} className={style === 'fitted' ? 'selected' : ''}><b>Fitted</b><small>Closer to the body</small></button></div></fieldset>
        <fieldset><legend>Size</legend><div className="sizes">{SIZES.map((value) => <button type="button" key={value} onClick={() => setSize(value)} className={size === value ? 'selected' : ''}>{value}</button>)}</div></fieldset>
        <div className="total"><span>Your one-off timestamp tee</span><strong>{price}</strong></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="buy" disabled={loading}>{loading ? 'Opening secure checkout…' : `Buy this moment — ${price}`}</button><p className="fine">Your timestamp is locked in when checkout begins.</p>
      </form>
    </section>
    <footer><span>© {new Date().getFullYear()} datetime.store</span><span>Made for people who notice time passing.</span></footer>
  </main>;
}
