'use client';

import { useEffect, useMemo, useState } from 'react';
import TimestampShirt from './timestamp-shirt';

type Fit = 'fitted' | 'unisex';
type Size = 'S' | 'M' | 'L' | 'XL';

const sizes: Size[] = ['S', 'M', 'L', 'XL'];

export default function Storefront() {
  const [fit, setFit] = useState<Fit>('fitted');
  const [size, setSize] = useState<Size>('M');
  const [now, setNow] = useState(() => new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      setNow(new Date());
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const timestamp = useMemo(() => ({
    iso: now.toISOString(),
    date: new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(now),
    time: new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'UTC' }).format(now),
    ms: String(now.getUTCMilliseconds()).padStart(3, '0'),
  }), [now]);

  async function beginCheckout() {
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fit, size, timestamp: timestamp.iso }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.url) throw new Error(payload.error || 'Checkout could not be started.');
      window.location.assign(payload.url);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'Checkout could not be started.');
      setLoading(false);
    }
  }

  return (
    <main className="store-shell">
      <nav className="topbar" aria-label="Main navigation">
        <a className="brand" href="/">datetime<span>.store</span></a>
        <div className="topbar-note"><span className="live-dot" /> printing the present</div>
      </nav>

      <section className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">edition 001 / now</p>
          <h1>Wear the<br /><em>moment.</em></h1>
          <p className="lede">A t-shirt with the current datetime.<br />Printed when you order.</p>
          <div className="hero-meta"><span>Free shipping</span><span>Ships in 7–10 days</span></div>
        </div>
        <div className="product-stage">
          <div className="stage-label">YOUR LOCAL TIME / LIVE</div>
          <TimestampShirt fit={fit} timestamp={timestamp} />
          <div className="stage-shadow" />
        </div>
      </section>

      <section className="purchase-panel" aria-label="Choose your shirt">
        <div className="panel-intro">
          <div><p className="eyebrow">the only thing to decide</p><h2>Your version of now</h2></div>
          <div className="price"><span>$30</span> $22.50</div>
        </div>

        <div className="option-row">
          <div className="option-block">
            <p className="option-label">Fit</p>
            <div className="segmented" role="group" aria-label="Fit">
              <button className={fit === 'fitted' ? 'selected' : ''} onClick={() => setFit('fitted')} type="button">Fitted</button>
              <button className={fit === 'unisex' ? 'selected' : ''} onClick={() => setFit('unisex')} type="button">Unisex</button>
            </div>
          </div>
          <div className="option-block size-block">
            <p className="option-label">Size</p>
            <div className="size-options" role="group" aria-label="Size">
              {sizes.map((item) => <button key={item} className={size === item ? 'selected' : ''} onClick={() => setSize(item)} type="button">{item}</button>)}
            </div>
          </div>
        </div>

        <div className="checkout-row">
          <div className="selected-detail"><span className="detail-icon">↗</span><span>Black {fit} tee / {size}</span></div>
          <button className="buy-button" disabled={loading} onClick={beginCheckout} type="button">
            {loading ? 'Opening checkout…' : <>Buy this timestamp <span>→</span></>}
          </button>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <p className="secure-note"><span>▣</span> Secure checkout by Stripe <i>·</i> made to order by Scalable Press</p>
      </section>

      <footer className="footer"><span>datetime.store</span><span>made for right now <b>✳</b></span></footer>
    </main>
  );
}
