'use client';

import { useEffect, useState } from 'react';

const choices = {
  fitted: { label: 'Fitted', hint: "Women's softstyle crew", sku: 'GLOBAL-TEE-GIL-64000L' },
  unisex: { label: 'Unisex', hint: 'Bella + Canvas v-neck', sku: 'GLOBAL-TEE-BC-3005' },
};

function Timestamp({ value }) {
  return <span className="timestamp">{value}</span>;
}

function Tee({ timestamp, style }) {
  return <div className={`tee-stage ${style}`} aria-label={`Black ${choices[style].label} t-shirt printed with ${timestamp}`}>
    <div className="tee-shadow" />
    <svg className="tee" viewBox="0 0 550 650" aria-hidden="true">
      <path d={style === 'fitted'
        ? 'M170 94C144 102 107 116 78 139L18 232l92 59 43-61 22 329c61 26 162 26 223 0l22-329 43 61 92-59-60-93c-29-23-66-37-92-45-18 38-44 57-78 57s-60-19-78-57Z'
        : 'M169 68C140 73 100 85 75 112L11 213l100 60 44-54 20 342c61 26 159 26 220 0l20-342 44 54 100-60-64-101c-25-27-65-39-94-44-20 47-45 71-81 71s-61-24-81-71Z'} />
    </svg>
    <div className="tee-print"><Timestamp value={timestamp} /></div>
    <div className="tape">ONE MOMENT ONLY</div>
  </div>;
}

export default function Storefront() {
  const [timestamp, setTimestamp] = useState('');
  const [style, setStyle] = useState('fitted');
  const [size, setSize] = useState('M');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const tick = () => setTimestamp(String(Date.now()));
    tick();
    const id = setInterval(tick, 37);
    return () => clearInterval(id);
  }, []);

  async function checkout() {
    setLoading(true); setError('');
    try {
      const timestampAtPurchase = String(Date.now());
      const response = await fetch('/api/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ style, size, timestamp: timestampAtPurchase }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.url) throw new Error(payload.error || 'Unable to begin checkout.');
      window.location.assign(payload.url);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.'); setLoading(false);
    }
  }

  return <main>
    <header className="topbar"><a href="#top" className="wordmark">datetime.store</a><span>EST. RIGHT NOW</span><a href="#details">THE DETAILS ↓</a></header>
    <section className="hero" id="top">
      <div className="intro"><p className="eyebrow">A TEMPORARY OBJECT</p><h1>Wear the<br /><em>exact</em> now.</h1><p className="lede">A t-shirt printed with the precise millisecond you decide it belongs to you.</p><div className="price"><span>$22.50</span><del>$30</del><small>FREE US SHIPPING</small></div></div>
      <Tee timestamp={timestamp} style={style} />
      <div className="hero-note">THE CLOCK DOES NOT PAUSE<br />FOR YOUR DECISION ↘</div>
    </section>
    <section className="shop" aria-label="Configure your t-shirt">
      <div className="shop-copy"><p className="eyebrow">MAKE IT YOURS</p><h2>Your timestamp<br />is waiting.</h2><p>The number on the shirt will be captured when you press buy—then individually printed to order.</p><div className="production">● PRINTED ON DEMAND<br />● DISPATCHES IN 3–5 DAYS</div></div>
      <div className="config">
        <fieldset><legend>01 / SILHOUETTE</legend><div className="options">{Object.entries(choices).map(([key, item]) => <button key={key} className={style === key ? 'selected' : ''} onClick={() => setStyle(key)}><strong>{item.label}</strong><small>{item.hint}</small></button>)}</div></fieldset>
        <fieldset><legend>02 / SIZE</legend><div className="sizes">{['S', 'M', 'L', 'XL', '2XL'].map(item => <button key={item} className={size === item ? 'selected' : ''} onClick={() => setSize(item)}>{item}</button>)}</div></fieldset>
        <div className="order-summary"><div><span>YOUR PRINT TIME</span><Timestamp value={timestamp} /></div><span>$22.50 USD</span></div>
        <button className="buy" onClick={checkout} disabled={loading}>{loading ? 'OPENING CHECKOUT…' : 'CAPTURE THIS MOMENT  →'}</button>
        {error && <p className="error" role="alert">{error}</p>}
        <p className="secure">SECURE CHECKOUT BY <strong>stripe</strong> · TAX & SHIPPING CALCULATED AT CHECKOUT</p>
      </div>
    </section>
    <section className="manifesto" id="details"><p className="eyebrow">ABOUT THE EXPERIMENT</p><div><h2>The present is<br />always leaving.</h2><p>datetime.store makes a tiny monument to the instant you choose. No inventory, no batch number, no two shirts alike—just one black tee and a number that will never appear again.</p></div><div className="steps"><span>01<br /><b>Choose a cut</b></span><span>02<br /><b>Press capture</b></span><span>03<br /><b>We print your now</b></span></div></section>
    <footer><span>© {new Date().getFullYear()} DATETIME.STORE</span><span>MADE TO ORDER · NOT RETURNED FOR CHANGE OF MIND</span><a href="mailto:hello@datetime.store">HELLO@DATETIME.STORE</a></footer>
  </main>;
}
