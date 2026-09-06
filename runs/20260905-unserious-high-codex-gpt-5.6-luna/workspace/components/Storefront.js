'use client';

import { useEffect, useMemo, useState } from 'react';

function formatTimestamp(value) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(new Date(value)).replace(',', '');
}

function Shirt({ timestamp, style }) {
  return (
    <div className="shirt-stage" aria-label={`Live T-shirt preview showing ${timestamp}`}>
      <div className={`shirt shirt-${style}`}>
        <div className="shirt-ink">
          <div className="shirt-time">{timestamp}</div>
          <div className="shirt-wordmark">DATETIME.STORE</div>
        </div>
      </div>
      <div className="preview-note"><span className="pulse-dot" /> the ink is currently happening</div>
    </div>
  );
}

export default function Storefront() {
  const [now, setNow] = useState(Date.now());
  const [style, setStyle] = useState('fitted');
  const [size, setSize] = useState('M');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [order, setOrder] = useState(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, 37);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('canceled')) setNotice({ type: 'info', text: 'No worries. Time remains undefeated.' });
    const sessionId = params.get('session_id');
    if (params.get('success') && sessionId) {
      setLoading(true);
      fetch('/api/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }) })
        .then(res => res.json())
        .then(data => {
          if (data.orderId) setOrder(data.orderId);
          else setNotice({ type: 'error', text: data.error || 'Payment succeeded, but fulfillment needs a retry.' });
        })
        .catch(() => setNotice({ type: 'error', text: 'Payment succeeded, but fulfillment needs a retry.' }))
        .finally(() => setLoading(false));
    }
  }, []);

  const timestamp = useMemo(() => formatTimestamp(now), [now]);
  const rawTimestamp = String(now);

  async function checkout() {
    setLoading(true);
    setNotice(null);
    try {
      const response = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ style, size, timestamp: rawTimestamp }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      window.location.assign(data.url);
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'Checkout is having a tiny existential crisis.' });
      setLoading(false);
    }
  }

  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="logo" href="/" aria-label="datetime.store home">datetime<span>.store</span></a>
        <div className="topbar-note">limited edition / unlimited milliseconds</div>
        <div className="topbar-badge">EST. NOW</div>
      </header>

      <section className="hero-grid">
        <div className="intro-copy">
          <p className="eyebrow">OBJECT 001 / WEARABLE TEMPORAL DATA</p>
          <h1>A shirt with<br /><em>one job.</em></h1>
          <p className="lede">It prints the exact date and time you order it. By the time it arrives, it will be vintage.</p>
          <div className="micro-proof"><span>01</span><span>made to order</span><span>02</span><span>free shipping</span></div>
        </div>
        <div className="preview-wrap">
          <div className="preview-label">LIVE PREVIEW <span>●</span></div>
          <Shirt timestamp={timestamp} style={style} />
          <div className="preview-footnote">Your timestamp right now:<br /><strong>{rawTimestamp} ms</strong></div>
        </div>
      </section>

      <section className="purchase-panel" aria-label="Choose your shirt">
        <div className="purchase-intro"><span className="section-number">03</span><div><h2>Make it yours.</h2><p>Pick a cut and size. The clock does the rest.</p></div></div>
        <div className="choice-block"><div className="choice-label">CUT <span>choose your silhouette</span></div><div className="choice-row">{[['fitted', 'Fitted', 'a little smug'], ['unisex', 'Unisex', 'room for snacks']].map(([value, label, note]) => <button key={value} className={`choice ${style === value ? 'selected' : ''}`} onClick={() => setStyle(value)}><span>{label}</span><small>{note}</small></button>)}</div></div>
        <div className="choice-block"><div className="choice-label">SIZE <span>standard human scale</span></div><div className="size-row">{['S', 'M', 'L', 'XL'].map(value => <button key={value} className={`size-choice ${size === value ? 'selected' : ''}`} onClick={() => setSize(value)}>{value}</button>)}</div></div>
        <div className="buy-block"><div className="price"><span className="was">$30.00</span><strong>$22.50</strong><small>free shipping</small></div><button className="buy-button" onClick={checkout} disabled={loading}>{loading ? 'Consulting the clock…' : 'Buy the shirt →'}</button></div>
      </section>

      {(notice || order) && <div className={`toast ${notice?.type || 'success'}`} role="status">{order ? <>Order accepted. The shirt robot has reference <strong>{order}</strong>.</> : notice.text}</div>}

      <footer className="footer"><div>datetime.store © whenever</div><div>no time machines were harmed in this transaction</div><div>made somewhere on earth <span>✳</span></div></footer>
    </main>
  );
}
