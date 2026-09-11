'use client';

import { ArrowRight, Check, ChevronDown, Heart, ShieldCheck, Sparkles } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';

type FormState = { firstName: string; secondName: string; place: string; date: string; size: string };
type ModelContext = { registerTool: (tool: { name: string; title: string; description: string; inputSchema: object; annotations: { readOnlyHint: boolean; untrustedContentHint: boolean }; execute: (input: unknown) => unknown }, options?: { signal?: AbortSignal }) => void | Promise<void> };

const initialForm: FormState = { firstName: 'Maya', secondName: 'Theo', place: 'Big Sur, California', date: '2021-06-18', size: 'm' };
const sizes = [['s', 'S'], ['m', 'M'], ['l', 'L'], ['xl', 'XL'], ['2xl', '2XL']];

function formatDate(value: string) {
  if (!value) return 'YOUR DATE';
  const [year, month, day] = value.split('-');
  return `${month}.${day}.${year}`;
}

function seedFrom(text: string) { return [...text].reduce((total, char) => total + char.charCodeAt(0), 0); }

function OrbitArtwork({ form }: { form: FormState }) {
  const seed = seedFrom(`${form.firstName}${form.secondName}${form.place}${form.date}`);
  const stars = useMemo(() => Array.from({ length: 18 }, (_, index) => ({
    x: 34 + ((seed * (index + 3) * 17) % 232), y: 42 + ((seed * (index + 7) * 29) % 252), r: index % 5 === 0 ? 2.2 : 1.15,
  })), [seed]);

  return (
    <svg viewBox="0 0 300 390" role="img" aria-label="Your personalized Orbitline print preview">
      <g fill="none" stroke="currentColor">
        <ellipse cx="150" cy="164" rx="92" ry="116" strokeWidth="1.4" />
        <ellipse cx="150" cy="164" rx="62" ry="116" strokeWidth="0.7" opacity=".7" transform="rotate(38 150 164)" />
        <ellipse cx="150" cy="164" rx="44" ry="116" strokeWidth="0.7" opacity=".55" transform="rotate(-43 150 164)" />
        <path d="M54 191c44-72 153-93 201-23" strokeWidth="2" />
        <path d="M66 113c48 60 122 96 189 64" strokeWidth=".65" opacity=".7" />
        <circle cx="91" cy="123" r="5" fill="#ff6b4a" stroke="none" />
        <circle cx="224" cy="203" r="5" fill="#ff6b4a" stroke="none" />
        {stars.map((star, index) => <circle key={index} cx={star.x} cy={star.y} r={star.r} fill="currentColor" stroke="none" opacity={index % 3 ? .62 : 1} />)}
      </g>
      <text x="150" y="325" textAnchor="middle" fill="currentColor" fontFamily="Georgia, serif" fontSize="25" letterSpacing="1">{(form.firstName || 'YOUR NAME').toUpperCase()} × {(form.secondName || 'THEIRS').toUpperCase()}</text>
      <text x="150" y="348" textAnchor="middle" fill="currentColor" fontFamily="Arial, sans-serif" fontSize="9" letterSpacing="2.5">{(form.place || 'YOUR PLACE').toUpperCase()}</text>
      <line x1="94" y1="361" x2="206" y2="361" stroke="currentColor" strokeWidth=".7" />
      <text x="150" y="379" textAnchor="middle" fill="currentColor" fontFamily="Arial, sans-serif" fontSize="8" letterSpacing="2">{formatDate(form.date)} · ONE MOMENT / ONE ORBIT</text>
    </svg>
  );
}

export default function Home() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get('success') === '1') {
      const sessionId = query.get('session_id');
      if (sessionId) {
        setVerifying(true);
        void fetch(`/api/order-status?session_id=${encodeURIComponent(sessionId)}`)
          .then(async (response) => ({ ok: response.ok, data: await response.json() as { paid?: boolean } }))
          .then(({ ok, data }) => { if (ok && data.paid) setSuccess(true); else setMessage('We could not confirm that payment. Please check your Stripe receipt before trying again.'); })
          .catch(() => setMessage('Payment confirmation is taking longer than expected. Please check your Stripe receipt.'))
          .finally(() => setVerifying(false));
      }
    }
    if (query.get('cancelled') === '1') setMessage('Checkout was cancelled. Your design is still here.');
    const context = (document as Document & { modelContext?: ModelContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({
      name: 'configure_orbitline_tee',
      title: 'Configure Orbitline tee',
      description: 'Fill the visible custom-shirt builder with two names, a meaningful place, a date, and a shirt size. This stages the design but does not start checkout or charge the customer.',
      inputSchema: {
        type: 'object',
        properties: {
          firstName: { type: 'string', minLength: 1, maxLength: 14 },
          secondName: { type: 'string', minLength: 1, maxLength: 14 },
          place: { type: 'string', minLength: 1, maxLength: 28 },
          date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          size: { type: 'string', enum: ['s', 'm', 'l', 'xl', '2xl'] },
        },
        required: ['firstName', 'secondName', 'place', 'date', 'size'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        if (!input || typeof input !== 'object') throw new Error('A complete design is required.');
        const next = input as FormState;
        if (!next.firstName || !next.secondName || !next.place || !/^\d{4}-\d{2}-\d{2}$/.test(next.date) || !sizes.some(([value]) => value === next.size)) throw new Error('Names, place, date, and a supported size are required.');
        const configured = { firstName: next.firstName.slice(0, 14), secondName: next.secondName.slice(0, 14), place: next.place.slice(0, 28), date: next.date, size: next.size };
        setForm(configured);
        document.querySelector('.customizer')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return { status: 'configured', design: configured, checkoutStarted: false };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  function update(field: keyof FormState, value: string) { setForm((current) => ({ ...current, [field]: value })); }

  async function checkout(event: FormEvent) {
    event.preventDefault(); setLoading(true); setMessage('');
    try {
      const response = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await response.json() as { url?: string; error?: string };
      if (!response.ok) throw new Error(data.error || 'Checkout could not be started.');
      if (!data.url) throw new Error('Checkout did not return a secure payment link.');
      window.location.assign(data.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Something went wrong. Please try again.'); setLoading(false);
    }
  }

  if (success || verifying) return (
    <main className="success-page"><div className="success-card">
      <span className="success-mark">{verifying ? '···' : <Check size={30} />}</span><p className="eyebrow">{verifying ? 'CONFIRMING PAYMENT' : 'PAYMENT RECEIVED'}</p>
      <h1>{verifying ? 'Checking the stars…' : 'Your moment is in motion.'}</h1><p>{verifying ? 'This usually takes only a second.' : 'We’ve received your payment and are preparing your one-of-one artwork for the print studio. A receipt is waiting in your inbox.'}</p>
      {!verifying && <button onClick={() => { window.history.replaceState({}, '', '/'); setSuccess(false); }} className="text-button">Create another <ArrowRight size={17} /></button>}
    </div></main>
  );

  return (
    <main>
      <nav className="nav-shell" aria-label="Main navigation">
        <a className="brand" href="#top" aria-label="Orbitline home"><span className="brand-mark">O</span><span>ORBITLINE</span></a>
        <div className="nav-note">MADE FOR ONE · NEVER REPEATED</div>
        <a className="nav-link" href="#details">THE DETAILS <ArrowRight size={15} /></a>
      </nav>

      <section className="builder" id="top">
        <div className="intro-copy">
          <p className="eyebrow"><Sparkles size={14} /> CUSTOM-MADE IN REAL TIME</p>
          <h1>Wear the moment<br />everything <em>aligned.</em></h1>
          <p className="lede">Your names, your place, your date—mapped into a one-of-one orbit and printed only for you.</p>
          <div className="trust-row"><span><ShieldCheck size={17} /> Secure checkout</span><span><Heart size={17} /> Printed to order</span></div>
        </div>

        <div className="product-stage" aria-label="Live personalized t-shirt preview">
          <span className="preview-label">LIVE PREVIEW</span>
          <div className="shirt-wrap"><img src="/orbitline-navy-tee.png" alt="Deep navy unisex t-shirt" /><div className="shirt-art"><OrbitArtwork form={form} /></div></div>
          <div className="stage-caption"><span>BELLA + CANVAS 3001</span><span>100% COMBED COTTON</span></div>
        </div>

        <form className="customizer" onSubmit={checkout}>
          <div className="form-heading"><p className="eyebrow">01 / MAKE IT YOURS</p><p className="step-note">Preview updates as you type</p></div>
          <label><span>YOUR NAME</span><input value={form.firstName} onChange={(event) => update('firstName', event.target.value)} maxLength={14} required placeholder="Maya" /></label>
          <label><span>THEIR NAME</span><input value={form.secondName} onChange={(event) => update('secondName', event.target.value)} maxLength={14} required placeholder="Theo" /></label>
          <label><span>THE PLACE</span><input value={form.place} onChange={(event) => update('place', event.target.value)} maxLength={28} required placeholder="Big Sur, California" /></label>
          <div className="form-pair">
            <label><span>THE DATE</span><input type="date" value={form.date} onChange={(event) => update('date', event.target.value)} required /></label>
            <label><span>SIZE</span><span className="select-wrap"><select value={form.size} onChange={(event) => update('size', event.target.value)} aria-label="Shirt size">{sizes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><ChevronDown size={16} /></span></label>
          </div>
          <div className="price-row"><div><strong>$44</strong><span>US shipping included</span></div><button type="submit" disabled={loading}>{loading ? 'OPENING CHECKOUT…' : 'MAKE MINE'} <ArrowRight size={18} /></button></div>
          {message && <p className="form-message" role="alert">{message}</p>}
          <p className="fine-print">Each tee is generated once, printed with water-based inks, and ships in 4–7 business days after production.</p>
        </form>
      </section>

      <section className="details" id="details">
        <p className="eyebrow">THE PIECE BEHIND THE PRINT</p><div className="details-grid">
          <h2>A keepsake that<br />doesn’t live in a drawer.</h2>
          <div className="detail-list">
            <article><span>01</span><div><h3>Designed from your story</h3><p>Every name, date and place changes the star field and orbital geometry. No two prints are identical.</p></div></article>
            <article><span>02</span><div><h3>Made on a better blank</h3><p>Soft, breathable Bella + Canvas cotton with a tailored unisex fit that holds its shape.</p></div></article>
            <article><span>03</span><div><h3>Printed only when ordered</h3><p>Direct-to-garment printing means rich detail, water-based inks and no pile of unwanted stock.</p></div></article>
          </div>
        </div>
      </section>
      <footer><span>ORBITLINE / PERSONAL ARTIFACTS</span><span>MADE ONE AT A TIME</span><span>© {new Date().getFullYear()}</span></footer>
    </main>
  );
}
