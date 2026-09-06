'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { ArrowUpRight, Check, ChevronDown, Clock3, Minus, Plus, ShoppingBag, Sparkles, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';

const COLORS = [
  { name: 'Black', value: 'black', swatch: '#0b0d12' },
  { name: 'Asphalt', value: 'asphalt', swatch: '#343941' },
  { name: 'Navy blue', value: 'navy blue', swatch: '#172a4d' },
  { name: 'White', value: 'white', swatch: '#f3f2ed' },
];
const SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL'];

function localMoment(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(date).reduce<Record<string, string>>((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

export default function Home() {
  const [now, setNow] = useState(() => new Date());
  const [color, setColor] = useState('black');
  const [size, setSize] = useState('M');
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const context = (document as Document & { modelContext?: { registerTool?: (...args: unknown[]) => unknown } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({
      name: 'add_timestamp_tee_to_cart',
      title: 'Add timestamp tee to cart',
      description: 'Stage the selected timestamp t-shirt, color, size, and quantity in the visible store cart.',
      inputSchema: {
        type: 'object',
        properties: {
          color: { type: 'string', enum: COLORS.map((item) => item.value) },
          size: { type: 'string', enum: SIZES },
          quantity: { type: 'integer', minimum: 1, maximum: 5 },
        },
        required: ['color', 'size', 'quantity'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input: unknown) {
        const next = input as { color: string; size: string; quantity: number };
        if (!COLORS.some((item) => item.value === next.color) || !SIZES.includes(next.size) || !Number.isInteger(next.quantity) || next.quantity < 1 || next.quantity > 5) {
          throw new Error('Choose a supported color, size, and quantity.');
        }
        setColor(next.color);
        setSize(next.size);
        setQuantity(next.quantity);
        setStatus('Ready in your cart.');
        return { product: 'The Current Moment tee', color: next.color, size: next.size, quantity: next.quantity };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  const colorLabel = useMemo(() => COLORS.find((item) => item.value === color)?.name ?? 'Black', [color]);
  const total = (34 * quantity).toFixed(2);

  async function beginCheckout() {
    setIsCheckingOut(true);
    setStatus('Opening secure checkout…');
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [{ productId: 'current-moment-tee', color, size, quantity }] }),
      });
      const data = await response.json() as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error || 'Checkout is unavailable right now.');
      window.location.assign(data.url);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Checkout is unavailable right now.');
      setIsCheckingOut(false);
    }
  }

  return (
    <main className="store-shell">
      <nav className="topbar" aria-label="Main navigation">
        <a className="brand" href="#top" aria-label="Night Shift Club home"><span className="brand-mark"><Terminal size={15} strokeWidth={2.5} /></span><span>night shift club</span></a>
        <div className="nav-links"><a href="#drop">the drop</a><a href="#details">details</a></div>
        <div className="nav-status"><span className="status-dot" /> sandbox store <ShoppingBag size={16} /></div>
      </nav>

      <div id="top" className="ticker"><span>LIVE LOCAL TIME</span><strong>{localMoment(now)}</strong><span className="ticker-zone">your timezone</span></div>

      <section className="hero" id="drop">
        <div className="hero-copy">
          <p className="eyebrow"><Sparkles size={14} /> small batch / made on demand</p>
          <h1>Wear the<br /><em>exact moment.</em></h1>
          <p className="intro">For people who notice the timestamp. A quiet, heavyweight tee stamped with the moment this drop went live.</p>
          <div className="hero-meta"><span><Clock3 size={15} /> edition 01 / 2026-09-06 23:41</span><span>ships worldwide</span></div>
        </div>

        <div className="product-image-wrap">
          <div className="image-kicker">NIGHT SHIFT<br />UNIFORM / 01</div>
          <Image src="/assets/nightshift-tee.png" alt="Black t-shirt with a white digital timestamp print on a cobalt blue background" className="product-image" width={1254} height={1254} priority />
          <div className="image-stamp">NSC<br />001</div>
        </div>

        <section className="product-panel" aria-labelledby="product-title">
          <div className="product-heading"><div><p className="product-label">the current moment</p><h2 id="product-title">Timestamp tee</h2></div><span className="price">$34</span></div>
          <p className="product-description">Unisex Gildan Softstyle 64000. Soft cotton jersey, front print, regular fit. Each one is printed after you order.</p>
          <div className="option-block"><div className="option-header"><span>color</span><strong>{colorLabel}</strong></div><div className="swatches" role="radiogroup" aria-label="Color">{COLORS.map((item) => <button key={item.value} type="button" className={`swatch ${color === item.value ? 'selected' : ''}`} style={{ backgroundColor: item.swatch }} aria-label={item.name} aria-pressed={color === item.value} onClick={() => setColor(item.value)}>{color === item.value && <Check size={14} />}</button>)}</div></div>
          <div className="option-block size-block"><div className="option-header"><span>size</span><a href="#details">size guide <ArrowUpRight size={13} /></a></div><div className="sizes" role="radiogroup" aria-label="Size">{SIZES.map((item) => <button key={item} type="button" className={`size-button ${size === item ? 'selected' : ''}`} aria-pressed={size === item} onClick={() => setSize(item)}>{item}</button>)}</div></div>
          <div className="purchase-row"><div className="quantity" aria-label="Quantity"><button type="button" aria-label="Decrease quantity" onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={15} /></button><span>{quantity}</span><button type="button" aria-label="Increase quantity" onClick={() => setQuantity(Math.min(5, quantity + 1))}><Plus size={15} /></button></div><Button className="checkout-button" onClick={beginCheckout} disabled={isCheckingOut}>{isCheckingOut ? 'opening checkout…' : `checkout · $${total}`} <ArrowUpRight size={17} /></Button></div>
          <p className="checkout-note">Secure test-mode checkout · shipping address collected in Stripe</p>
          {status && <output className="status-message">{status}</output>}
        </section>
      </section>

      <section className="detail-strip" id="details">
        <div><span className="detail-index">01</span><h3>made for the awake</h3><p>A little signal for late-night builders, early-morning thinkers, and everyone who checks the time twice.</p></div>
        <div><span className="detail-index">02</span><h3>printed when ordered</h3><p>Your tee is produced through Prodigi’s on-demand network, so there is no warehouse full of yesterday.</p></div>
        <div><span className="detail-index">03</span><h3>carefully unremarkable</h3><p>Machine wash low, inside out. The only thing loud about it should be the timestamp.</p></div>
      </section>
      <footer><span>© 2026 night shift club</span><span>made for the exact moment</span><a href="#top">back to top <ChevronDown size={14} className="back-icon" /></a></footer>
    </main>
  );
}
