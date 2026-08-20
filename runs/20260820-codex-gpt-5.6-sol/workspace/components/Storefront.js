'use client';

import { useEffect, useState } from 'react';

const options = {
  style: [
    ['fitted', 'Fitted', 'Bella + Canvas 6004'],
    ['unisex', 'Unisex', 'Next Level 3600'],
  ],
  size: [['S', 'S'], ['M', 'M'], ['L', 'L'], ['XL', 'XL']],
};

function Shirt({ style, frozenAt }) {
  const [now, setNow] = useState(frozenAt || Date.now());

  useEffect(() => {
    if (frozenAt) return;
    let frame;
    const tick = () => { setNow(Date.now()); frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [frozenAt]);

  const fitted = style === 'fitted';
  return (
    <div className="shirt-stage" aria-label={`Black ${style} t-shirt preview printed with ${now}`}>
      <div className="orbit orbit-one" /><div className="orbit orbit-two" />
      <svg className={`shirt ${fitted ? 'fitted' : 'unisex'}`} viewBox="0 0 520 600" role="img">
        <defs>
          <linearGradient id="fabric" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#303236"/><stop offset=".45" stopColor="#111214"/><stop offset="1" stopColor="#050505"/>
          </linearGradient>
          <filter id="shadow"><feDropShadow dx="0" dy="20" stdDeviation="18" floodOpacity=".28"/></filter>
        </defs>
        <path filter="url(#shadow)" fill="url(#fabric)" d={fitted
          ? 'M173 62c18 41 50 55 87 55s69-14 87-55l91 43 61 105-73 49-38-54c-13 93 1 206 29 314-101 30-213 30-314 0 28-108 42-221 29-314l-38 54-73-49 61-105 91-43z'
          : 'M167 60c24 39 56 57 93 57s69-18 93-57l101 44 56 112-77 41-45-59v321c-90 27-166 27-256 0V198l-45 59-77-41 56-112 101-44z'} />
        <path fill="none" stroke="#404247" strokeWidth="5" d="M173 62c14 44 46 67 87 67s73-23 87-67" opacity=".8"/>
        <text x="260" y="247" fill="#fff" textAnchor="middle" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="29" fontWeight="600" letterSpacing="-1">{now}</text>
        <text x="260" y="282" fill="#94979d" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="10" letterSpacing="2.4">UNIX TIME · MILLISECONDS</text>
      </svg>
      <div className="price-tag"><span>$30</span><strong>$22.50</strong><small>SHIPS FREE</small></div>
    </div>
  );
}

export default function Storefront() {
  const [style, setStyle] = useState('fitted');
  const [size, setSize] = useState('M');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [frozenAt, setFrozenAt] = useState(null);

  async function checkout() {
    setLoading(true); setError('');
    const timestamp = Date.now(); setFrozenAt(timestamp);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ style, size, timestamp }),
      });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || 'Checkout is unavailable.');
      window.location.assign(data.url);
    } catch (err) {
      setError(err.message); setLoading(false); setFrozenAt(null);
    }
  }

  return (
    <main>
      <nav><a className="wordmark" href="/">datetime<span>.store</span></a><div className="nav-note"><i /> printing time since 2017</div></nav>
      <section className="hero">
        <div className="visual"><Shirt style={style} frozenAt={frozenAt} /></div>
        <div className="buy-panel">
          <div className="eyebrow">A ONE-OF-ONE T-SHIRT</div>
          <h1>Wear this<br/><em>exact moment.</em></h1>
          <p className="lede">We print the Unix timestamp from the instant you order. Once the moment passes, it’s yours alone.</p>

          <fieldset><legend>01 / Choose your fit</legend><div className="option-grid fit-grid">
            {options.style.map(([value,label,detail]) => <button type="button" key={value} onClick={() => setStyle(value)} className={style === value ? 'selected' : ''}><b>{label}</b><small>{detail}</small></button>)}
          </div></fieldset>
          <fieldset><legend>02 / Pick a size</legend><div className="option-grid size-grid">
            {options.size.map(([value,label]) => <button type="button" key={value} onClick={() => setSize(value)} className={size === value ? 'selected' : ''}>{label}</button>)}
          </div></fieldset>

          <button className="checkout" onClick={checkout} disabled={loading}>{loading ? <><i className="spinner"/> Freezing your moment…</> : <>Get this moment <span>$22.50 →</span></>}</button>
          {error && <p className="error" role="alert">{error}</p>}
          <div className="trust"><span>◈ Secure checkout</span><span>♻ Printed to order</span><span>✦ Free U.S. shipping</span></div>
        </div>
      </section>
      <footer><p>One timestamp. One shirt. Your moment.</p><p>Printed responsibly in the USA · <a href="mailto:hello@datetime.store">Questions?</a></p></footer>
    </main>
  );
}
