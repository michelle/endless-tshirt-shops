'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, ChevronDown, LockKeyhole, Minus, Plus, Sparkles, WandSparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const badges = [
  { id: 'orbit', label: 'Orbit', symbol: '◌', note: 'always in motion' },
  { id: 'spark', label: 'Spark', symbol: '✦', note: 'make it matter' },
  { id: 'moon', label: 'Moon', symbol: '◐', note: 'soft after dark' },
  { id: 'wave', label: 'Wave', symbol: '∿', note: 'keep moving' },
] as const;
const sizes = ['S', 'M', 'L', 'XL', '2XL', '3XL'];
const price = 44;
type OrderForm = { name: string; phrase: string; badge: (typeof badges)[number]['id']; size: string };

function clampText(value: string, max: number) {
  return value.replace(/[^\p{L}\p{N}\s'!?.&,/@#:+-]/gu, '').slice(0, max);
}

export default function Home() {
  const [form, setForm] = useState<OrderForm>({ name: 'Mara', phrase: 'stay curious', badge: 'orbit', size: 'M' });
  const [quantity, setQuantity] = useState(1);
  const [checkoutState, setCheckoutState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('paid') === '1') setNotice('Payment received. Your one-of-one is now queued for print.');
    else if (params.get('cancelled') === '1') setNotice('Checkout paused — your design is still here whenever you are ready.');
  }, []);

  const selectedBadge = badges.find((badge) => badge.id === form.badge) ?? badges[0];
  const total = useMemo(() => price * quantity, [quantity]);
  const phraseLines = form.phrase.trim() ? form.phrase.trim().split(/\s+/).slice(0, 5) : ['your', 'words'];

  function updateField(field: 'name' | 'phrase', value: string) {
    setForm((current) => ({ ...current, [field]: field === 'name' ? clampText(value, 22) : clampText(value, 42) }));
  }

  async function startCheckout() {
    setCheckoutState('loading'); setNotice('');
    try {
      const response = await fetch('/api/create-checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, quantity }) });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error || 'Checkout could not be started.');
      window.location.assign(data.url);
    } catch (error) {
      setCheckoutState('error'); setNotice(error instanceof Error ? error.message : 'Checkout could not be started.');
    }
  }

  return (
    <main className="site-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Make It Yours home"><span className="brand-mark">MIY</span><span className="brand-name">make it yours</span></a>
        <nav className="header-nav" aria-label="Main navigation"><a href="#customize">Customize</a><a href="#details">The tee</a><a href="#story">Why DTG</a></nav>
        <div className="header-meta"><span className="status-dot" /> made one at a time</div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy"><p className="eyebrow"><span>Edition 01</span><span className="eyebrow-line" /><span>personal artifact</span></p><h1>Put a little<br /><em>you</em> into it.</h1><p className="hero-lede">A heavyweight tee built around your words, your mark, your moment. Set the signal below and we&apos;ll print it only when you say go.</p><a className="text-link" href="#customize">Start with your phrase <ArrowRight size={16} /></a></div>
        <div className="hero-stamp" aria-hidden="true"><span>DTG / 01</span><span>small batch</span><span>made for you</span></div>
      </section>

      {notice && <div className={`notice ${checkoutState === 'error' ? 'notice-error' : ''}`} role="status">{notice}</div>}

      <section className="builder" id="customize">
        <div className="builder-panel">
          <div className="section-kicker"><span>01</span><span>Build the front</span></div>
          <div className="builder-title-row"><div><h2>Your signal</h2><p>Two lines, one feeling. Keep it short enough to wear.</p></div><span className="live-pill"><span className="live-dot" /> live</span></div>
          <div className="field-group"><Label htmlFor="name">Your name or word <span>optional</span></Label><Input id="name" value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="e.g. Mara" /></div>
          <div className="field-group"><Label htmlFor="phrase">The phrase <span>{form.phrase.length}/42</span></Label><Input id="phrase" value={form.phrase} onChange={(event) => updateField('phrase', event.target.value)} placeholder="e.g. stay curious" /><p className="field-hint">Your phrase is set in a tactile, all-caps studio type.</p></div>
          <div className="field-group"><Label>Choose a mark</Label><div className="badge-grid" role="radiogroup" aria-label="Choose a badge">{badges.map((badge) => <button key={badge.id} type="button" className={`badge-option ${form.badge === badge.id ? 'selected' : ''}`} onClick={() => setForm((current) => ({ ...current, badge: badge.id }))} role="radio" aria-checked={form.badge === badge.id}><span className="badge-symbol">{badge.symbol}</span><span><strong>{badge.label}</strong><small>{badge.note}</small></span>{form.badge === badge.id && <Check size={15} className="badge-check" />}</button>)}</div></div>
          <div className="field-group size-group"><div className="label-row"><Label>Size</Label><a href="#details">See size guide</a></div><div className="size-options" role="radiogroup" aria-label="Choose a size">{sizes.map((size) => <button key={size} type="button" className={`size-option ${form.size === size ? 'selected' : ''}`} onClick={() => setForm((current) => ({ ...current, size }))} role="radio" aria-checked={form.size === size}>{size}</button>)}</div></div>
          <div className="order-row"><div className="quantity-control" aria-label="Quantity"><button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Decrease quantity"><Minus size={14} /></button><span>{quantity}</span><button type="button" onClick={() => setQuantity((value) => Math.min(5, value + 1))} aria-label="Increase quantity"><Plus size={14} /></button></div><div className="price-block"><span>Total</span><strong>${total}.00</strong></div></div>
          <Button className="checkout-button" onClick={startCheckout} disabled={checkoutState === 'loading'}>{checkoutState === 'loading' ? 'Opening secure checkout…' : 'Continue to secure checkout'}<ArrowRight size={18} /></Button>
          <p className="secure-note"><LockKeyhole size={13} /> Stripe secures payment · ships in 5–8 business days</p>
        </div>

        <div className="preview-panel"><div className="preview-topline"><span>Live preview</span><span>black / front</span></div><div className="shirt-preview"><img src="/product-shirt.png" alt="Black heavyweight t-shirt product preview" /><div className="print-overlay" aria-live="polite"><div className="print-meta">MIY / 01</div><div className="print-phrase">{phraseLines.map((line, index) => <span key={`${line}-${index}`}>{line}</span>)}</div><div className="print-rule" /><div className="print-footer"><span>{form.name || 'your word'}</span><span className="print-mark">{selectedBadge.symbol}</span></div></div><div className="preview-note preview-note-top"><WandSparkles size={14} /> your design, live</div><div className="preview-note preview-note-bottom">DTG print / one of one</div></div><div className="preview-caption"><Sparkles size={15} /><span>Printed in full color, direct to garment. No minimums, no leftovers.</span></div></div>
      </section>

      <section className="detail-strip" id="details"><div className="detail-intro"><div className="section-kicker"><span>02</span><span>The base layer</span></div><h2>Quietly<br />substantial.</h2><p>Premium AS Colour 5001 cotton with a soft hand-feel and enough weight to hold its shape.</p></div><div className="detail-list"><div><span>Fabric</span><strong>100% combed cotton</strong></div><div><span>Weight</span><strong>180 gsm / midweight</strong></div><div><span>Fit</span><strong>Regular unisex</strong></div><div><span>Print</span><strong>Full-color DTG front</strong></div><div><span>Sizes</span><strong>S — 3XL</strong></div></div><div className="size-card"><div className="size-card-head"><span>Size guide</span><ChevronDown size={16} /></div><div className="size-table"><span>size</span><span>chest</span><span>length</span><span>M</span><span>21 in</span><span>29 in</span><span>L</span><span>23 in</span><span>30 in</span></div><p>Between sizes? We recommend sizing up for a relaxed fit.</p></div></section>
      <section className="story" id="story"><div className="story-mark">✦</div><div><div className="section-kicker"><span>03</span><span>Why direct-to-garment</span></div><h2>Made when<br />it means something.</h2></div><p>DTG lets us print your exact design in small runs, with rich color and soft detail that sits in the fabric. Your shirt is not pulled from a shelf — it is made for you, after you make it yours.</p></section>
      <footer className="site-footer"><span>make it yours © 2026</span><span>one phrase / one mark / one tee</span><a href="#top">Back to top ↑</a></footer>
    </main>
  );
}
