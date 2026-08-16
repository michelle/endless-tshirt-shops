'use client';

import { useEffect, useMemo, useState } from 'react';

const styles = [
  { id: 'fitted', name: 'Fitted', detail: 'A soft, tailored silhouette' },
  { id: 'unisex', name: 'Unisex', detail: 'A classic everyday fit' },
];
const sizes = ['S', 'M', 'L', 'XL'];

function Shirt({ style, frozen }) {
  const [time, setTime] = useState(Date.now());
  useEffect(() => {
    if (frozen) return;
    const id = setInterval(() => setTime(Date.now()), 43);
    return () => clearInterval(id);
  }, [frozen]);
  const stamp = String(time);
  return <div className="shirt-wrap" aria-label={`Black ${style} t-shirt showing ${stamp}`}>
    <svg className="shirt" viewBox="0 0 520 600" role="img">
      <defs><linearGradient id="fabric" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#17171b"/><stop offset=".5" stopColor="#050506"/><stop offset="1" stopColor="#19191d"/></linearGradient></defs>
      <path className="shadow" d="M133 83 45 143l56 119 57-34 7 287q95 35 190 0l7-287 57 34 56-119-88-60q-35 35-67 35t-67-35Z" />
      <path fill="url(#fabric)" d={style === 'fitted' ? 'M137 81 55 141l50 105 61-38 13 301q81 30 162 0l13-301 61 38 50-105-82-60q-34 34-65 34t-66-34Z' : 'M137 58 36 139l67 115 63-42 10 298q84 30 168 0l10-298 63 42 67-115-101-81q-35 58-73 58t-73-58Z'} />
      <path fill="none" stroke="#38383d" strokeWidth="3" d="M194 88q29 43 66 43t66-43"/>
      <text x="260" y="202" fill="white" textAnchor="middle" className="stamp">{stamp}</text>
      <text x="260" y="230" fill="#9a9a9e" textAnchor="middle" className="micro">CAPTURED IN THE PRESENT</text>
    </svg>
    <div className="price"><span>Was $30</span> $22.50</div>
  </div>;
}

export default function Storefront() {
  const [style, setStyle] = useState('fitted');
  const [size, setSize] = useState('M');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const orderLabel = useMemo(() => `${styles.find((x) => x.id === style).name}, ${size}`, [style, size]);
  async function checkout(e) {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const res = await fetch('/api/checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ style, size, email }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to start checkout.');
      window.location.assign(data.url);
    } catch (err) { setError(err.message); setLoading(false); }
  }
  return <main>
    <header><a className="wordmark" href="/">datetime<span>.</span>store</a><p>we sell a t-shirt with the current datetime.</p><div className="now"><i/> LIVE · RIGHT NOW</div></header>
    <section className="shop">
      <div className="product"><Shirt style={style} frozen={loading}/><p className="caption">Every shirt is made to order. The number you see is the exact moment your design was created.</p></div>
      <form className="panel" onSubmit={checkout}>
        <div className="eyebrow">BUILD YOUR MOMENT</div><h1>A shirt from<br/>right now.</h1>
        <fieldset><legend>Fit</legend><div className="choices fit">{styles.map((item) => <label className={style === item.id ? 'active' : ''} key={item.id}><input type="radio" name="style" value={item.id} checked={style === item.id} onChange={() => setStyle(item.id)}/><b>{item.name}</b><small>{item.detail}</small></label>)}</div></fieldset>
        <fieldset><legend>Size</legend><div className="choices sizes">{sizes.map((item) => <label className={size === item ? 'active' : ''} key={item}><input type="radio" name="size" value={item} checked={size === item} onChange={() => setSize(item)}/>{item}</label>)}</div></fieldset>
        <label className="email">Email for your receipt<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"/></label>
        {error && <p className="error" role="alert">{error}</p>}
        <button disabled={loading} type="submit">{loading ? 'Opening secure checkout…' : 'Buy now — $22.50'} <span>→</span></button>
        <p className="fine">Secure checkout powered by Stripe. Shipping is collected at checkout.</p>
        <p className="selection">{orderLabel} · Black · made for this moment</p>
      </form>
    </section>
    <footer><span>© {new Date().getFullYear()} datetime.store</span><span>Printed on demand · Designed in real time</span></footer>
  </main>;
}
