'use client';

import { useEffect, useMemo, useState } from 'react';
import CheckoutPanel from './CheckoutPanel';

function ShirtPreview({ timestamp, style, disabled }) {
  const fittedPath = 'M79.312,15.149c-1.629-1.631-16.117-6.146-16.117-6.146s-4.31,8.721-11.66,8.721s-11.66-8.721-11.66-8.721s-15.354,4.936-16.486,6.068c-1.13,1.13-13.712,16.992-13.712,16.992l10.081,8.37l6.614-5.518c0,0,14.411,23.971,1.384,58.875c0,0,43.546,10.767,47.434,0c-9.689-43.26,1.379-58.613,1.379-58.613l6.267,5.228l9.35-11.117C92.185,29.288,80.945,16.781,79.312,15.149z';
  const unisexPath = 'M79.313,6.142C77.683,4.511,63.196,4,63.196,4s-9.844,13.724-11.661,13.724C49.719,17.724,39.875,4,39.875,4S24.521,4.932,23.389,6.064c-1.13,1.13-22.827,24.89-22.827,24.89L16.71,42.975l9.662-8.06l1.384,58.875c0,0,43.541,10.705,47.433,0l1.379-58.613l9.347,7.797L100,30.953C100,30.953,80.945,7.774,79.313,6.142z';
  return (
    <div className={`shirt-stage ${disabled ? 'is-disabled' : ''}`}>
      <div className="stage-note">LIVE EDITION · {style.toUpperCase()}</div>
      <div className="shirt-art" aria-label={`Black ${style} shirt preview showing timestamp ${timestamp}`}>
        <div className="shirt-print">
          <div className="shirt-ms">{timestamp}</div>
          <div className="shirt-iso">{new Date(timestamp).toISOString()}</div>
        </div>
        <svg viewBox="0 0 100 125" role="img" aria-hidden="true">
          <path d={style === 'fitted' ? fittedPath : unisexPath} />
        </svg>
      </div>
      <div className="stage-caption">
        <span>current as of</span>
        <strong>{new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</strong>
      </div>
    </div>
  );
}

export default function Storefront() {
  const [now, setNow] = useState(() => Date.now());
  const [style, setStyle] = useState('fitted');
  const [size, setSize] = useState('M');
  const [checkoutLocked, setCheckoutLocked] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 47);
    return () => window.clearInterval(interval);
  }, []);

  const dateLabel = useMemo(() => new Date(now).toLocaleDateString([], {
    year: 'numeric', month: 'short', day: '2-digit', weekday: 'short',
  }), [now]);

  return (
    <main className="store-shell">
      <header className="topbar">
        <a className="wordmark" href="/" aria-label="datetime.store home">datetime<span>.</span>store</a>
        <div className="topbar-meta"><span>EDITION 001</span><span className="topbar-dot" /> <span>{dateLabel}</span></div>
      </header>

      <section className="hero-grid">
        <div className="intro-block">
          <p className="eyebrow">A small record of now</p>
          <h1>the present,<br /><em>printed.</em></h1>
          <p className="intro-copy">A t-shirt with the current datetime, down to the millisecond. Every order captures a moment that can&apos;t happen twice.</p>
          <div className="intro-footnote"><span className="scroll-mark">↓</span><span>SELECT YOUR<br />MOMENT BELOW</span></div>
        </div>

        <div className="product-block">
          <ShirtPreview timestamp={now} style={style} disabled={checkoutLocked} />
        </div>

        <aside className="purchase-card" aria-label="Choose your datetime shirt">
          <div className="card-header"><span>01 / 01</span><span>THE DATETIME TEE</span></div>
          <div className="price-row"><div><span className="price-old">$30.00</span><span className="price">$22.50</span></div><span className="price-note">FREE SHIPPING<br />US ONLY</span></div>
          <p className="product-description">A black, soft cotton tee carrying one exact timestamp. Printed to order in your chosen fit.</p>

          <div className="selector-group">
            <div className="selector-label"><span>FIT</span><span>01</span></div>
            <div className="segmented two-up">
              {['fitted', 'unisex'].map((value) => <button key={value} className={style === value ? 'selected' : ''} onClick={() => setStyle(value)} type="button" disabled={checkoutLocked}>{value}</button>)}
            </div>
          </div>
          <div className="selector-group">
            <div className="selector-label"><span>SIZE</span><span>02</span></div>
            <div className="segmented four-up">
              {['S', 'M', 'L', 'XL'].map((value) => <button key={value} className={size === value ? 'selected' : ''} onClick={() => setSize(value)} type="button" disabled={checkoutLocked}>{value}</button>)}
            </div>
          </div>

          <CheckoutPanel style={style} size={size} onLockChange={setCheckoutLocked} />
        </aside>
      </section>

      <footer className="site-footer"><span>MADE FOR THE PRESENT</span><span>PRINTED BY PRODIGI · CHARGED BY STRIPE</span><span>© {new Date().getFullYear()} DATETIME.STORE</span></footer>
    </main>
  );
}
