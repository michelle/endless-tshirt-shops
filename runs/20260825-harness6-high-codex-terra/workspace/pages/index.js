import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';

const cuts = [
  { id: 'fitted', label: 'Fitted', detail: 'A soft, tailored women’s tee' },
  { id: 'unisex', label: 'Unisex', detail: 'A classic, relaxed crew tee' },
];
const sizes = ['S', 'M', 'L', 'XL'];

function Shirt({ cut, timestamp }) {
  return (
    <div className={`shirt-stage ${cut}`} aria-label={`Black ${cut} t-shirt preview`}>
      <svg className="shirt" viewBox="0 0 430 500" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="cotton" x1="0" x2="1" y1="0" y2="1">
            <stop stopColor="#303235" /><stop offset=".5" stopColor="#121315" /><stop offset="1" stopColor="#242629" />
          </linearGradient>
        </defs>
        {cut === 'fitted' ? (
          <path d="M116 74c-29 7-61 26-82 53l43 74 42-27c-4 77-20 162-32 247 41 18 215 18 256 0-13-84-28-171-32-247l42 27 43-74c-21-27-53-46-82-53-13 27-31 43-53 43s-40-16-53-43Z" fill="url(#cotton)" />
        ) : (
          <path d="M116 48c-30 5-69 28-96 62l55 82 52-35 9 264c49 15 171 15 220 0l9-264 52 35 55-82c-27-34-66-57-96-62-25 34-43 49-65 49s-40-15-65-49Z" fill="url(#cotton)" />
        )}
        <path d="M163 79c14 25 29 37 52 37 24 0 39-12 52-37" fill="none" stroke="#3e4043" strokeWidth="5" />
        <path d="M126 167c25 10 49 15 89 15s64-5 89-15" fill="none" stroke="#fff" strokeOpacity=".025" strokeWidth="2" />
        <text x="215" y="202" textAnchor="middle" fill="white" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontWeight="500" fontSize="19" letterSpacing=".5">{timestamp}</text>
      </svg>
      <div className="price-tag"><span>$30.00</span> $22.50</div>
    </div>
  );
}

export default function Home() {
  const [cut, setCut] = useState('fitted');
  const [size, setSize] = useState('M');
  const [timestamp, setTimestamp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const update = () => setTimestamp(String(Date.now()));
    update();
    const timer = window.setInterval(update, 50);
    return () => window.clearInterval(timer);
  }, []);

  const selectedCut = useMemo(() => cuts.find((option) => option.id === cut), [cut]);
  const checkout = async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cut, size, timestamp }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Checkout could not start.');
      window.location.assign(data.url);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return <>
    <Head>
      <title>datetime.store — a shirt from this moment</title>
      <meta name="description" content="A t-shirt printed with the exact moment you made it yours." />
      <meta name="theme-color" content="#f7f8f5" />
    </Head>
    <main>
      <header className="masthead">
        <a className="wordmark" href="/">datetime.store</a>
        <p>we sell a t-shirt with the current datetime.</p>
      </header>
      <section className="product-grid">
        <div className="visual-column"><Shirt cut={cut} timestamp={timestamp || '…'} /></div>
        <div className="purchase-column">
          <p className="eyebrow">Made when you say so</p>
          <h1>This exact moment,<br />on a shirt.</h1>
          <p className="intro">The number on the front is a live Unix timestamp. It freezes at checkout and is printed just for you.</p>
          <fieldset>
            <legend>Choose a cut</legend>
            <div className="choice-grid">
              {cuts.map((option) => <button type="button" key={option.id} onClick={() => setCut(option.id)} className={`choice ${cut === option.id ? 'selected' : ''}`} aria-pressed={cut === option.id}>
                <strong>{option.label}</strong><small>{option.detail}</small>
              </button>)}
            </div>
          </fieldset>
          <fieldset>
            <legend>Choose a size</legend>
            <div className="size-row">
              {sizes.map((option) => <button type="button" key={option} onClick={() => setSize(option)} className={`size ${size === option ? 'selected' : ''}`} aria-pressed={size === option}>{option}</button>)}
            </div>
          </fieldset>
          <div className="summary"><span>{selectedCut.label} · Black · {size}</span><strong>$22.50 <small>USD</small></strong></div>
          <button className="buy" type="button" onClick={checkout} disabled={loading}>{loading ? 'Preparing secure checkout…' : 'Buy this moment →'}</button>
          {error && <p className="error" role="alert">{error}</p>}
          <p className="fine-print">Free standard shipping in the US. Secure checkout by Stripe. Printed on demand and shipped in 3–7 business days.</p>
        </div>
      </section>
      <footer><span>© {new Date().getFullYear()} datetime.store</span><span>Each shirt is made to order.</span></footer>
    </main>
  </>;
}
