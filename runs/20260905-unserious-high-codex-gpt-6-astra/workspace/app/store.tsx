'use client';

import { useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowUpRight, Clock3, Globe2, LockKeyhole, Package, Plus, X, Pause, RotateCcw } from 'lucide-react';
import { PRODUCTS, SIZES, type ShirtStyle } from '@/lib/catalog';

export function Logo() { return <a className="logo" href="/" aria-label="datetime.store home"><Clock3 strokeWidth={2.5} /><span>datetime<span className="logo-dot">.</span>store</span></a>; }

function SizeGuide({ style }: { style: ShirtStyle }) {
  return <Dialog.Root><Dialog.Trigger className="text-link">Size guide <ArrowUpRight size={14} /></Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="dialog-content"><div className="eyebrow">MEASURE TWICE. TIME ONCE.</div><Dialog.Title>Find your fit.</Dialog.Title><Dialog.Description>Body chest measurements in inches. Both fits are unisex; fitted has a closer, tailored shape.</Dialog.Description><div className="table-wrap"><table><thead><tr><th>Fit</th>{SIZES.map(size => <th key={size}>{size}</th>)}</tr></thead><tbody>{Object.entries(PRODUCTS).map(([key, product]) => <tr className={style === key ? 'selected-row' : ''} key={key}><th>{product.name}</th>{product.chest.map(n => <td key={n}>{n}″</td>)}</tr>)}</tbody></table></div><p className="guide-note">Measure around the fullest part of your chest. Between sizes? Size up for a little more breathing room. Time is tight enough.</p><p className="small muted">Unisex: Gildan 5000 · Fitted: Bella+Canvas 3001<br />Garment length: S 28″ · M 29″ · L 30″ · XL 31″</p><Dialog.Close className="dialog-close" aria-label="Close size guide"><X /></Dialog.Close></Dialog.Content></Dialog.Portal></Dialog.Root>;
}

export default function Store({ testMode }: { testMode: boolean }) {
  const [now, setNow] = useState<number | null>(null);
  const [style, setStyle] = useState<ShirtStyle>('unisex');
  const [size, setSize] = useState<typeof SIZES[number]>('M');
  const [busy, setBusy] = useState(false);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState('');
  const [canceled, setCanceled] = useState(false);
  const [frozen, setFrozen] = useState<number | null>(null);
  const requestId = useRef<string | null>(null);
  const capturedMoment = useRef<{ token: string; timestamp: number } | null>(null);
  useEffect(() => {
    setCanceled(new URLSearchParams(window.location.search).get('checkout') === 'canceled');
    try { const saved = JSON.parse(sessionStorage.getItem('datetime-selection') || 'null'); if (saved && saved.style in PRODUCTS && SIZES.includes(saved.size)) { setStyle(saved.style); setSize(saved.size); } } catch { /* storage is optional */ }
  }, []);
  useEffect(() => {
    if (paused || busy) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 73);
    return () => window.clearInterval(timer);
  }, [paused, busy]);
  const timestamp = frozen ?? now;
  async function checkout() {
    if (busy) return;
    setError(''); setBusy(true); setFrozen(Date.now());
    if (!requestId.current) requestId.current = crypto.randomUUID();
    try {
      sessionStorage.setItem('datetime-selection', JSON.stringify({ style, size }));
    } catch { /* blocked storage should not block buying */ }
    try {
      if (!capturedMoment.current) {
        const captureResponse = await fetch('/api/moment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ style, size }) });
        const capture = await captureResponse.json();
        if (!captureResponse.ok) throw new Error(capture.error || 'Could not capture the moment.');
        capturedMoment.current = capture;
      }
      setFrozen(capturedMoment.current!.timestamp);
      const response = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: capturedMoment.current!.token, requestId: requestId.current }) });
      const data = await response.json();
      if (response.status === 410 || response.status === 400) { capturedMoment.current = null; requestId.current = null; }
      if (!response.ok || !data.url) throw new Error(data.error || 'Checkout took a little too long. Please try again.');
      setFrozen(data.timestamp);
      window.location.assign(data.url);
    } catch (e) { setError(e instanceof Error ? e.message : 'Something went sideways. Please try again.'); setBusy(false); setFrozen(null); }
  }
  function changeStyle(value: ShirtStyle) { setStyle(value); requestId.current = null; capturedMoment.current = null; }
  function changeSize(value: typeof SIZES[number]) { setSize(value); requestId.current = null; capturedMoment.current = null; }
  return <>
    <a href="#product" className="skip-link">Skip to the shirt</a>
    <div className="announcement"><span>TIME IS A CONSTRUCT. THIS SHIRT IS COTTON.</span><span className="announcement-right">FREE US SHIPPING <ArrowUpRight size={13} /></span></div>
    <header className="site-header"><Logo /><nav aria-label="Main navigation"><a href="#how-it-works">The idea <ArrowUpRight size={14} /></a><a href="#questions">Very good questions <ArrowUpRight size={14} /></a><span className="nav-status"><i /> {testMode ? 'TEST STORE' : 'EST. RIGHT NOW'}</span></nav></header>
    <main>
      <section className="product-section" id="product" aria-label="The datetime t-shirt">
        <div className="product-visual">
          <div className="stage-top"><span className="live-indicator"><i /> {busy ? 'MOMENT CAPTURED' : paused ? 'PREVIEW PAUSED' : 'LIVE PREVIEW'}</span><span>OBJECT NO. 001</span></div>
          <div className="shirt-stage">
            <div className="shirt-wrap"><img src="/shirt.png" className="shirt-image" alt="Black cotton crew-neck T-shirt with a small white Unix timestamp printed across the chest" width="1254" height="1254" fetchPriority="high" /><span className="shirt-timestamp" aria-hidden="true">{timestamp ?? '0000000000000'}</span></div>
            <div className="moment-sticker" aria-hidden="true"><span>LIMITED EDITION</span><strong>of right<br />now.</strong><span>VERY, VERY LIMITED</span></div>
            <span className="side-note">NOT A SMART SHIRT. AT ALL.</span>
          </div>
          <div className="live-console"><div><span className="console-label">YOUR CURRENT MOMENT</span><div className="console-value">{timestamp ?? '-------------'}<span>ms</span></div></div><button className="pause-button" onClick={() => setPaused(!paused)} disabled={busy} aria-label={paused ? 'Resume live timestamp preview' : 'Pause live timestamp preview'} aria-pressed={paused}>{paused ? <RotateCcw size={18} /> : <Pause size={18} />}</button></div>
          <div className="stage-bottom"><span>Front print / black / {PRODUCTS[style].name.toLowerCase()}</span><span>Illustrative preview ↗</span></div>
        </div>
        <div className="product-info">
          <div className="eyebrow product-eyebrow"><span className="mini-star">✳</span> THE ORIGINAL DATETIME TEE</div>
          <h1>Wear right now.<br /><span>Forever.</span><span className="headline-asterisk">*</span></h1>
          <p className="product-description">A t-shirt with the exact moment you decided to buy a t-shirt. That’s it. That’s the store.</p>
          <div className="price-row"><span className="price">$22.50 <span>USD</span></span><span className="price-note">One moment. Yours to keep.</span></div>
          <form onSubmit={e => { e.preventDefault(); void checkout(); }}>
            <fieldset disabled={busy} className="fit-field"><legend><span className="step-label">01</span> Pick your fit</legend><div className="fit-options">{(['unisex','fitted'] as const).map(value => <label className={`fit-option ${style === value ? 'active' : ''}`} key={value}><input type="radio" name="fit" value={value} checked={style === value} onChange={() => changeStyle(value)} /><span><strong>{PRODUCTS[value].name}</strong><small>{value === 'unisex' ? 'Room to exist' : 'A little closer'}</small></span><span className="radio-circle">{style === value && <span />}</span></label>)}</div></fieldset>
            <fieldset disabled={busy} className="size-field"><legend><span className="step-label">02</span> Pick your size</legend><div className="size-guide-anchor"><SizeGuide style={style} /></div><div className="size-options">{SIZES.map(value => <label className={`size-option ${size === value ? 'active' : ''}`} key={value}><input type="radio" name="size" value={value} checked={size === value} onChange={() => changeSize(value)} />{value}</label>)}</div></fieldset>
            <div className="capture-note"><Clock3 size={16} /><span>The clock freezes when you hit the button below.</span></div>
            {canceled && !error && <div className="notice" role="status">Back so soon? No payment was taken. Your next moment is waiting.</div>}
            {error && <div className="error-notice" role="alert">{error}</div>}
            <button className="checkout-button" type="submit" disabled={busy}><span>{busy ? 'Bottling this moment…' : 'Make this moment a shirt'}</span>{busy ? <span className="spinner" /> : <ArrowUpRight size={25} />}</button>
            <div className="checkout-assurance"><span><LockKeyhole size={13} /> Secure checkout</span><span><Package size={14} /> Free US shipping</span></div>
          </form>
          {testMode && <div className="test-note"><span className="test-tag">A DRESS REHEARSAL</span> Test checkout. No real charge. No shirt ships.</div>}
          <p className="footnote">*The shirt doesn’t update. We cannot stress this enough.</p>
        </div>
      </section>
      <div className="ticker-band" aria-hidden="true"><span>100% COTTON</span><span>✳</span><span>0% TIME TRAVEL</span><span>✳</span><span>PRINTED JUST FOR YOU</span><span>✳</span><span>ALREADY OUT OF DATE</span><span>✳</span><span>100% COTTON</span></div>
      <section className="how-section" id="how-it-works"><div className="section-heading"><span className="eyebrow">A VERY SIMPLE CONCEPT</span><h2>Time flies.<br />Put it on a shirt.</h2><p>Some moments change your life.<br />This one changes your laundry.</p></div><div className="how-steps"><article><span className="how-number">01 /</span><Clock3 /><h3>Catch a moment.</h3><p>Hit the button. We capture the current Unix timestamp, down to the millisecond.</p></article><article><span className="how-number">02 /</span><span className="type-icon" aria-hidden="true">Aa</span><h3>We make it wearable.</h3><p>Your exact number, printed in white on a black cotton tee. Made to order by Prodigi.</p></article><article><span className="how-number">03 /</span><Globe2 /><h3>Confuse a stranger.</h3><p>Wear it out. Explain it poorly. Enjoy owning a very specific piece of the past.</p></article></div></section>
      <section className="faq-section" id="questions"><div><span className="eyebrow">FAIR QUESTIONS</span><h2>Wait. What?</h2><p>Yes, we’ve thought about this.<br />Arguably too much.</p></div><div className="faq-list">{[
        ['What is that ridiculously long number?', 'It’s a Unix timestamp: the number of milliseconds since January 1, 1970 at 00:00:00 UTC. It identifies one exact moment, everywhere on Earth. Romantic, in a spreadsheet kind of way.'],
        ['Does the time on the shirt keep changing?', 'No. It is ink on cotton. The preview ticks, then we capture the server’s current timestamp when you start checkout. That exact number appears in your checkout and on your shirt. Pausing the preview does not choose a past timestamp.'],
        ['What am I actually getting?', 'One black, 100% cotton crew-neck tee with your timestamp printed in white across the chest. Choose a classic Gildan 5000 unisex fit or a tailored Bella+Canvas 3001 fitted option. Both fits are unisex. The product image is an illustrative mockup; check the size guide for measurements.'],
        ['Where does it ship, and when?', 'This store offers free standard shipping within the United States. Each shirt is printed to order; allow roughly 3–5 business days for production, plus transit. Delivery timing is an estimate. In test mode, no physical item is produced or shipped.'],
        ['Can I return a moment?', 'Time itself is non-refundable. For shirts, each print is custom, so check your size before ordering. This is currently a test store: no money is charged and no returns are needed. Customer support and the final returns policy will be published before real orders open.'],
      ].map(([question, answer]) => <details key={question}><summary>{question}<Plus size={20} /></summary><p>{answer}</p></details>)}</div></section>
    </main>
    <footer><div className="footer-top"><Logo /><p>Thanks for spending some of your time here.</p><a href="#product">Back to right now <ArrowUpRight size={17} /></a></div><div className="footer-bottom"><span>© {new Date().getFullYear()} datetime.store</span><span>Inspired by <a href="https://github.com/michelle/datetime.store" target="_blank" rel="noreferrer">Michelle’s original experiment ↗</a></span><span>NOTHING LASTS FOREVER. EXCEPT MAYBE THIS BIT.</span></div></footer>
  </>;
}
