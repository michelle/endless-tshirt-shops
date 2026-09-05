import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const PRICE = 22.5;
const SIZES = ['S', 'M', 'L', 'XL'];

function pad(value, length = 2) {
  return String(value).padStart(length, '0');
}

function formatTimestamp(date) {
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
    ms: pad(date.getMilliseconds(), 3),
    zone: Intl.DateTimeFormat().resolvedOptions().timeZone.replace('_', ' '),
  };
}

function ShirtArtwork({ timestamp, fit }) {
  const { date, time, ms } = formatTimestamp(timestamp);
  return (
    <div className={`shirt-stage ${fit}`} aria-label="Black timestamp t-shirt preview">
      <div className="shirt-shadow" />
      <svg className="shirt-svg" viewBox="0 0 420 510" role="img" aria-hidden="true">
        <path className="shirt-shape" d={fit === 'fitted'
          ? 'M127 53c24 19 43 28 83 28s59-9 83-28l63 35 43 82-45 32-25-27-9 311H100l-9-311-25 27-45-32 43-82 63-35Z'
          : 'M113 42c31 28 49 39 97 39s66-11 97-39l74 46 39 82-48 34-39-35-8 324H95l-8-324-39 35-48-34 39-82 74-46Z'} />
        <path className="shirt-seam" d="M128 54c20 22 41 32 82 32s62-10 82-32M105 173l10 301M315 173l-10 301" />
        <foreignObject x="95" y="200" width="230" height="125">
          <div className="print-art" xmlns="http://www.w3.org/1999/xhtml">
            <span>{date}</span>
            <strong>{time}<i>.{ms}</i></strong>
            <small>datetime.store / {fit === 'fitted' ? 'FIT' : 'CLASSIC'}</small>
          </div>
        </foreignObject>
      </svg>
      <div className="shirt-tag">ONE MOMENT<br /><span>ONLY</span></div>
    </div>
  );
}

function TimestampReadout({ timestamp }) {
  const { date, time, ms, zone } = formatTimestamp(timestamp);
  return (
    <div className="readout" aria-live="polite">
      <span className="readout-dot" />
      <span>{date} / {time}<em>.{ms}</em></span>
      <span className="readout-zone">{zone}</span>
    </div>
  );
}

function CheckoutPanel({ timestamp, fit, size, setSize, onClose }) {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  async function startCheckout() {
    setStatus('loading');
    setError('');
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestamp: timestamp.toISOString(), fit, size }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.url) throw new Error(payload.error || 'Checkout is temporarily unavailable.');
      window.location.assign(payload.url);
    } catch (checkoutError) {
      setStatus('idle');
      setError(checkoutError.message);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="checkout-panel" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
        <button className="icon-button close-button" onClick={onClose} aria-label="Close checkout">×</button>
        <div className="checkout-kicker">YOUR MOMENT IS RESERVED</div>
        <h2 id="checkout-title">Make it permanent.</h2>
        <p className="checkout-intro">Your tee will be printed with this exact timestamp. Stripe handles the secure checkout and collects your shipping details.</p>
        <div className="checkout-preview">
          <ShirtArtwork timestamp={timestamp} fit={fit} />
          <div>
            <div className="checkout-name">The timestamp tee</div>
            <div className="checkout-meta">{fit === 'fitted' ? 'Fitted cut' : 'Classic cut'} · black · {timestamp.toLocaleDateString()}</div>
            <div className="checkout-price">${PRICE.toFixed(2)} <span>free shipping</span></div>
          </div>
        </div>
        <div className="choice-label">SIZE <span>Unisex sizing · true to size</span></div>
        <div className="size-grid">
          {SIZES.map((item) => <button key={item} className={size === item ? 'selected' : ''} onClick={() => setSize(item)}>{item}</button>)}
        </div>
        <button className="primary-button checkout-button" onClick={startCheckout} disabled={status === 'loading'}>
          {status === 'loading' ? 'Opening secure checkout…' : <>Continue to checkout <span>↗</span></>}
        </button>
        {error && <p className="form-error">{error}</p>}
        <p className="secure-note"><span>⌁</span> Secure payment by Stripe · free worldwide shipping</p>
      </section>
    </div>
  );
}

function SuccessPage({ sessionId }) {
  return (
    <main className="success-page">
      <div className="success-mark">✓</div>
      <div className="eyebrow">MOMENT CAPTURED</div>
      <h1>Your timestamp is<br /><em>on its way.</em></h1>
      <p>Payment received. We’re sending your one-of-one design to the print floor now. A confirmation will land in your inbox shortly.</p>
      {sessionId && <div className="order-ref">STRIPE REFERENCE <strong>{sessionId.slice(-12).toUpperCase()}</strong></div>}
      <a className="text-link" href="/">← Back to the store</a>
    </main>
  );
}

function App() {
  const [now, setNow] = useState(() => new Date());
  const [fit, setFit] = useState('fitted');
  const [size, setSize] = useState('M');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [reservedTime, setReservedTime] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const params = useMemo(() => new URLSearchParams(window.location.search), []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 41);
    return () => window.clearInterval(timer);
  }, []);

  if (params.get('session_id')) return <SuccessPage sessionId={params.get('session_id')} />;

  function reserveMoment() {
    setReservedTime(new Date());
    setCheckoutOpen(true);
  }

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="wordmark" href="/">datetime<span>.</span>store</a>
        <nav>
          <a href="#how-it-works">How it works</a>
          <button onClick={() => setShowDetails((value) => !value)}>Details <span className={showDetails ? 'rotate' : ''}>↓</span></button>
        </nav>
        <div className="header-status"><span className="live-dot" /> LIVE / {new Date().getFullYear()}</div>
      </header>

      <main>
        <section className="hero-grid">
          <div className="hero-copy">
            <div className="eyebrow">A TEE FOR RIGHT NOW</div>
            <h1>Wear the<br /><em>moment.</em></h1>
            <p className="hero-lede">A black t-shirt printed with the precise date and time you order it. No two are ever the same.</p>
            <TimestampReadout timestamp={now} />
            <div className="hero-actions">
              <button className="primary-button" onClick={reserveMoment}>Capture this moment <span>↗</span></button>
              <div className="price-lockup"><strong>${PRICE.toFixed(2)}</strong><span>free shipping<br />everywhere</span></div>
            </div>
            <div className="micro-proof"><span className="avatar-stack"><i /><i /><i /></span> <span>2,184 moments already captured</span></div>
          </div>
          <div className="hero-product">
            <div className="product-note note-top">PRINTED<br />LIVE <span>✦</span></div>
            <ShirtArtwork timestamp={now} fit={fit} />
            <div className="product-note note-bottom"><span>01</span> / 01<br />UNIQUE EDITION</div>
            <div className="vertical-label">DESIGNED FOR THE PRESENT</div>
          </div>
        </section>

        <section className="selector-strip" aria-label="Product options">
          <div className="selector-group"><span className="selector-label">FIT</span><div className="segmented-control"><button className={fit === 'fitted' ? 'selected' : ''} onClick={() => setFit('fitted')}>Fitted</button><button className={fit === 'classic' ? 'selected' : ''} onClick={() => setFit('classic')}>Classic</button></div></div>
          <div className="selector-group"><span className="selector-label">COLOR</span><div className="color-option"><i className="color-swatch" /> Black</div></div>
          <div className="selector-group selector-copy"><span className="selector-label">THE IDEA</span><span>It only exists once: when you do.</span></div>
        </section>

        {showDetails && <section className="details-panel" id="details"><div><span className="eyebrow">MATERIALS</span><p>100% cotton<br />Bella + Canvas 3001</p></div><div><span className="eyebrow">PRINT</span><p>Direct-to-garment<br />Water-based ink</p></div><div><span className="eyebrow">FULFILLMENT</span><p>Printed on demand<br />Shipped free worldwide</p></div></section>}

        <section className="how-section" id="how-it-works">
          <div><div className="eyebrow">HOW IT WORKS</div><h2>Time moves.<br />This stays.</h2></div>
          <div className="steps"><div><span>01</span><p><strong>Find your now</strong><br />The live clock becomes your design.</p></div><div><span>02</span><p><strong>Make it yours</strong><br />Choose your cut and size.</p></div><div><span>03</span><p><strong>Keep the receipt</strong><br />We print and ship it to you.</p></div></div>
        </section>
      </main>

      <footer><span>datetime.store © {new Date().getFullYear()}</span><span>for people who notice</span><span>made on earth · shipped everywhere</span></footer>
      {checkoutOpen && <CheckoutPanel timestamp={reservedTime || now} fit={fit} size={size} setSize={setSize} onClose={() => setCheckoutOpen(false)} />}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
