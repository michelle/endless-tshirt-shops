import Head from 'next/head';
import { useEffect, useState } from 'react';

const SIZES = ['S', 'M', 'L', 'XL'];
const STYLES = [
  { id: 'fitted', label: 'Fitted', note: 'A closer, shorter cut' },
  { id: 'unisex', label: 'Unisex', note: 'A classic relaxed fit' },
];

function Shirt({ timestamp, style, frozen }) {
  return (
    <div className={`shirt-card ${style}`} aria-label={`Black ${style} t-shirt printed with ${timestamp}`}>
      <div className="shirt-shadow" />
      <svg className="shirt" viewBox="0 0 600 690" aria-hidden="true">
        <defs>
          <linearGradient id="shirtTone" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#24242a" />
            <stop offset=".42" stopColor="#08080a" />
            <stop offset="1" stopColor="#1a1a20" />
          </linearGradient>
        </defs>
        {style === 'fitted' ? (
          <path d="M179 68c-31 7-70 24-100 49L25 177l82 76 57-43 22 403c75 25 198 25 228 0l22-403 57 43 82-76-54-60c-30-25-69-42-100-49-15 42-48 66-101 66s-86-24-101-66Z" fill="url(#shirtTone)" />
        ) : (
          <path d="M178 65c-34 5-78 22-111 52L10 179l95 82 59-50 19 405c74 23 197 23 234 0l19-405 59 50 95-82-57-62c-33-30-77-47-111-52-18 45-49 69-102 69s-84-24-102-69Z" fill="url(#shirtTone)" />
        )}
        <path d="M240 75c14 25 35 37 60 37s46-12 60-37c-17 13-37 19-60 19s-43-6-60-19Z" fill="#030304" opacity=".82" />
      </svg>
      <div className={`print ${frozen ? 'frozen' : ''}`}>{timestamp}</div>
      <div className="price-badge"><span>$30.00</span> $22.50</div>
    </div>
  );
}

export default function Home() {
  const [timestamp, setTimestamp] = useState(() => Date.now());
  const [style, setStyle] = useState('fitted');
  const [size, setSize] = useState('M');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (loading) return undefined;
    let frame;
    const tick = () => { setTimestamp(Date.now()); frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [loading]);

  async function checkout() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ style, size, timestamp }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.url) throw new Error(payload.error || 'Could not start checkout. Please try again.');
      window.location.assign(payload.url);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>datetime.store — a shirt from this exact moment</title>
        <meta name="description" content="A black t-shirt printed with the exact moment you chose it." />
        <meta name="theme-color" content="#f7f6f3" />
      </Head>
      <main>
        <header className="masthead">
          <a className="wordmark" href="/">datetime.store</a>
          <p>we sell a t-shirt with the current datetime. <span aria-hidden="true">◷</span></p>
        </header>
        <section className="shop" aria-label="Choose your datetime shirt">
          <div className="product">
            <Shirt timestamp={timestamp} style={style} frozen={loading} />
            <p className="product-note">Your exact timestamp is printed in white. The clock pauses when you check out.</p>
          </div>
          <div className="checkout">
            <div className="eyebrow">Your datetime shirt</div>
            <h1>Make this moment wearable.</h1>
            <p className="intro">Printed to order on a soft black tee. Shipping is on us.</p>
            <fieldset disabled={loading}>
              <legend>Fit</legend>
              <div className="choice-grid fits">
                {STYLES.map((option) => <label className={`choice ${style === option.id ? 'selected' : ''}`} key={option.id}>
                  <input type="radio" name="style" value={option.id} checked={style === option.id} onChange={() => setStyle(option.id)} />
                  <b>{option.label}</b><small>{option.note}</small>
                </label>)}
              </div>
            </fieldset>
            <fieldset disabled={loading}>
              <legend>Size</legend>
              <div className="size-grid">
                {SIZES.map((option) => <label className={`size-choice ${size === option ? 'selected' : ''}`} key={option}>
                  <input type="radio" name="size" value={option} checked={size === option} onChange={() => setSize(option)} />{option}
                </label>)}
              </div>
            </fieldset>
            <div className="total"><span>One shirt · free US shipping</span><strong>$22.50</strong></div>
            <button className="buy" onClick={checkout} disabled={loading}>{loading ? 'Preparing secure checkout…' : 'Buy this moment'}</button>
            {error && <p className="error" role="alert">{error}</p>}
            <p className="secure">Secure checkout by <strong>Stripe</strong> · Printed and shipped by Scalable Press</p>
          </div>
        </section>
        <footer>Made for a very particular point in time.</footer>
      </main>
    </>
  );
}
