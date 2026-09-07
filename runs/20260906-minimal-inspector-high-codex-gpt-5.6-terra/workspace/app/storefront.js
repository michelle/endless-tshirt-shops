'use client';

import { useEffect, useMemo, useState } from 'react';

const SIZES = ['S', 'M', 'L', 'XL'];

function useNow(frozenAt) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (frozenAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 31);
    return () => window.clearInterval(id);
  }, [frozenAt]);
  return frozenAt || now;
}

export default function Storefront() {
  const [fit, setFit] = useState('fitted');
  const [size, setSize] = useState('M');
  const [frozenAt, setFrozenAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const timestamp = useNow(frozenAt);
  const instant = useMemo(() => new Date(timestamp).toISOString().replace('T', ' · ').replace('.000Z', ' UTC'), [timestamp]);

  async function checkout() {
    const capturedAt = Date.now();
    setFrozenAt(capturedAt);
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fit, size, timestamp: capturedAt }),
      });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || 'Checkout could not start.');
      window.location.assign(data.url);
    } catch (err) {
      setError(err.message || 'Checkout could not start.');
      setLoading(false);
      setFrozenAt(null);
    }
  }

  return (
    <main>
      <header className="site-header">
        <a className="wordmark" href="/">datetime.store</a>
        <span className="edition">one shirt · one moment</span>
      </header>

      <section className="product-grid" aria-label="The datetime shirt">
        <div className="shirt-stage">
          <div className="stage-label">THE TIME IS NOW</div>
          <img src="/black-tee.png" className={fit === 'fitted' ? 'shirt fitted' : 'shirt'} alt="Black t-shirt with live timestamp" />
          <output className="timestamp" aria-label={`Timestamp ${timestamp}`}>{timestamp}</output>
          <div className="stamp-note">captured at checkout</div>
        </div>

        <div className="purchase-panel">
          <p className="eyebrow">A wearable timestamp</p>
          <h1>The exact moment<br />you made it yours.</h1>
          <p className="intro">We print the current Unix time on a black tee. No reruns. No backdating. Your shirt gets its own instant.</p>

          <div className="price-row">
            <span className="old-price">$30.00</span>
            <span className="price">$22.50</span>
            <span className="shipping">free US shipping</span>
          </div>

          <fieldset>
            <legend>Choose a fit</legend>
            <div className="segmented">
              {['fitted', 'unisex'].map((option) => (
                <button key={option} type="button" onClick={() => setFit(option)} className={fit === option ? 'selected' : ''} aria-pressed={fit === option}>
                  {option}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>Size</legend>
            <div className="size-grid">
              {SIZES.map((option) => (
                <button key={option} type="button" onClick={() => setSize(option)} className={size === option ? 'selected' : ''} aria-pressed={size === option}>{option}</button>
              ))}
            </div>
          </fieldset>

          <div className="moment-card" aria-live="polite">
            <span>YOUR PRINT TIME</span>
            <strong>{timestamp}</strong>
            <small>{instant}</small>
          </div>

          {error && <p className="error" role="alert">{error}</p>}
          <button className="checkout" type="button" onClick={checkout} disabled={loading}>
            {loading ? 'Preparing your moment…' : 'Get this timestamp'} <span aria-hidden="true">↗</span>
          </button>
          <p className="microcopy">Secure checkout by Stripe. Printed to order by Prodigi.</p>
        </div>
      </section>

      <footer>
        <span>Timestamped in milliseconds.</span>
        <span>Printed on demand.</span>
      </footer>
    </main>
  );
}
