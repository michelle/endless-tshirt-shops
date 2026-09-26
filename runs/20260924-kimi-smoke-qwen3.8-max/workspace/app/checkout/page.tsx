'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import {
  decodeDesign,
  encodeDesign,
  formatCoord,
  garmentColor,
  PALETTES,
  sizeLabel,
} from '@/lib/design';
import { COUNTRIES, countryName, formatCents } from '@/lib/pricing';

type Shipping = {
  name: string;
  email: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

const EMPTY_SHIPPING: Shipping = {
  name: '',
  email: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  zip: '',
  country: 'US',
};

type Stage = 'form' | 'payment';

export default function CheckoutPage() {
  return (
    <Suspense fallback={<Header compact />}>
      <CheckoutInner />
    </Suspense>
  );
}

function CheckoutInner() {
  const router = useRouter();
  const params = useSearchParams();

  const design = useMemo(() => {
    const d = params.get('d');
    return d ? decodeDesign(d) : null;
  }, [params]);
  const color = params.get('color') ?? 'black';
  const size = params.get('size') ?? 'm';
  const qty = Math.min(3, Math.max(1, Number(params.get('qty') ?? '1') || 1));
  const cancelled = params.get('cancel') === '1';

  const garment = garmentColor(color);

  const [shipping, setShipping] = useState<Shipping>(EMPTY_SHIPPING);
  const [stage, setStage] = useState<Stage>('form');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // payment step state
  const [orderToken, setOrderToken] = useState('');
  const [orderId, setOrderId] = useState('');
  const [pricing, setPricing] = useState<{ itemsCents: number; shippingCents: number; totalCents: number } | null>(null);
  const [paymentMode, setPaymentMode] = useState<'stripe' | 'testpay'>('testpay');
  const [card, setCard] = useState({ number: '4242 4242 4242 4242', exp: '12 / 34', cvc: '123', name: '' });

  useEffect(() => {
    if (design) setCard((c) => ({ ...c, name: c.name || shipping.name }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design]);

  if (!design) {
    return (
      <>
        <Header compact />
        <main className="container thanks">
          <h1>Nothing to check out yet</h1>
          <p className="sub">Start by designing your topographic portrait.</p>
          <Link href="/design" className="btn btn-accent">Open the design studio</Link>
        </main>
      </>
    );
  }

  const setField = (k: keyof Shipping, v: string) => setShipping((s) => ({ ...s, [k]: v }));

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ design, product: { color, size, qty }, shipping }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not create the order.');
      setOrderToken(data.token);
      setOrderId(data.orderId);
      setPricing(data.pricing);
      setPaymentMode(data.paymentMode);
      setStage('payment');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const payStripe = async () => {
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: orderToken }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Could not start Stripe checkout.');
      window.location.href = data.url;
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  const payTestpay = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/payments/testpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: orderToken, card }),
      });
      const data = await res.json();
      if (!res.ok || data.status !== 'paid') {
        throw new Error(data.error ?? 'Payment failed.');
      }
      router.push(
        `/thanks?t=${encodeURIComponent(orderToken)}&ref=${encodeURIComponent(data.prodigiOrderId ?? '')}&mode=testpay`,
      );
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  const palette = PALETTES[design.palette];
  const thumb = `/api/render?d=${encodeURIComponent(encodeDesign(design))}&w=400`;
  const needsState = ['US', 'CA', 'AU'].includes(shipping.country);

  return (
    <>
      <Header compact />
      <main className="container checkout">
        {/* ---------- left: forms ---------- */}
        <div>
          {cancelled && (
            <p className="error-note" style={{ marginBottom: 16 }}>
              Checkout was cancelled — nothing was charged. You can try again below.
            </p>
          )}

          {stage === 'form' && (
            <form onSubmit={placeOrder} className="panel">
              <h2 style={{ fontSize: 26, marginBottom: 4 }}>Shipping address</h2>
              <p className="tiny" style={{ marginBottom: 18 }}>
                Your print lab needs this to get the shirt to you.
              </p>
              <div className="form-grid">
                <div className="full">
                  <label htmlFor="name">Full name</label>
                  <input id="name" required value={shipping.name} onChange={(e) => setField('name', e.target.value)} autoComplete="name" />
                </div>
                <div className="full">
                  <label htmlFor="email">Email</label>
                  <input id="email" type="email" required value={shipping.email} onChange={(e) => setField('email', e.target.value)} autoComplete="email" />
                </div>
                <div className="full">
                  <label htmlFor="line1">Address line 1</label>
                  <input id="line1" required value={shipping.line1} onChange={(e) => setField('line1', e.target.value)} autoComplete="address-line1" />
                </div>
                <div className="full">
                  <label htmlFor="line2">Address line 2 (optional)</label>
                  <input id="line2" value={shipping.line2} onChange={(e) => setField('line2', e.target.value)} autoComplete="address-line2" />
                </div>
                <div>
                  <label htmlFor="city">City</label>
                  <input id="city" required value={shipping.city} onChange={(e) => setField('city', e.target.value)} autoComplete="address-level2" />
                </div>
                <div>
                  <label htmlFor="state">{needsState ? 'State / province' : 'State / county (optional)'}</label>
                  <input id="state" value={shipping.state} onChange={(e) => setField('state', e.target.value)} autoComplete="address-level1" />
                </div>
                <div>
                  <label htmlFor="zip">Postal / ZIP code</label>
                  <input id="zip" required value={shipping.zip} onChange={(e) => setField('zip', e.target.value)} autoComplete="postal-code" />
                </div>
                <div>
                  <label htmlFor="country">Country</label>
                  <select id="country" value={shipping.country} onChange={(e) => setField('country', e.target.value)} autoComplete="country">
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="full">
                  <label htmlFor="phone">Phone (optional, helps couriers)</label>
                  <input id="phone" type="tel" value={shipping.phone} onChange={(e) => setField('phone', e.target.value)} autoComplete="tel" />
                </div>
              </div>
              {error && <p className="error-note">{error}</p>}
              <div style={{ marginTop: 22 }}>
                <button className="btn btn-accent btn-block" type="submit" disabled={busy}>
                  {busy ? 'Creating order…' : 'Continue to payment →'}
                </button>
              </div>
            </form>
          )}

          {stage === 'payment' && (
            <div className="panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <h2 style={{ fontSize: 26 }}>Payment</h2>
                <button className="linklike tiny" type="button" onClick={() => { setStage('form'); setError(''); }}>
                  ← edit address
                </button>
              </div>
              <p className="tiny" style={{ margin: '6px 0 4px' }}>
                Order <span className="mono">{orderId}</span> · shipping to {shipping.name}, {shipping.city},{' '}
                {countryName(shipping.country)}
              </p>

              {paymentMode === 'stripe' ? (
                <div className="payment-box" style={{ borderTop: 'none', paddingTop: 16 }}>
                  <p className="small" style={{ marginBottom: 16 }}>
                    You&rsquo;ll be redirected to Stripe&rsquo;s secure checkout. Your shirt is sent to the
                    print lab only after Stripe confirms payment.
                  </p>
                  {error && <p className="error-note">{error}</p>}
                  <button className="btn btn-accent btn-block" type="button" onClick={payStripe} disabled={busy}>
                    {busy ? 'Opening Stripe…' : `Pay ${pricing ? formatCents(pricing.totalCents) : ''} with Stripe →`}
                  </button>
                </div>
              ) : (
                <form onSubmit={payTestpay} className="payment-box" style={{ borderTop: 'none', paddingTop: 16 }}>
                  <div className="testpay-hint">
                    <strong>Sandbox payment mode.</strong> No Stripe keys are configured on this
                    deployment, so payment is simulated — but the invariant is real: the Prodigi
                    print order is created <em>only after</em> payment succeeds. Use{' '}
                    <code>4242 4242 4242 4242</code> to succeed or <code>4000 0000 0000 0002</code>{' '}
                    to see a decline.
                  </div>
                  <div className="card-grid">
                    <div className="full">
                      <label htmlFor="cnum">Card number</label>
                      <input id="cnum" className="mono-input" required value={card.number}
                        onChange={(e) => setCard({ ...card, number: e.target.value })} inputMode="numeric" />
                    </div>
                    <div>
                      <label htmlFor="cexp">Expiry</label>
                      <input id="cexp" className="mono-input" required placeholder="MM / YY" value={card.exp}
                        onChange={(e) => setCard({ ...card, exp: e.target.value })} />
                    </div>
                    <div>
                      <label htmlFor="ccvc">CVC</label>
                      <input id="ccvc" className="mono-input" required value={card.cvc}
                        onChange={(e) => setCard({ ...card, cvc: e.target.value })} inputMode="numeric" />
                    </div>
                    <div className="full">
                      <label htmlFor="cname">Name on card</label>
                      <input id="cname" required value={card.name || shipping.name}
                        onChange={(e) => setCard({ ...card, name: e.target.value })} />
                    </div>
                  </div>
                  {error && <p className="error-note">{error}</p>}
                  <div style={{ marginTop: 22 }}>
                    <button className="btn btn-accent btn-block" type="submit" disabled={busy}>
                      {busy ? 'Processing…' : `Pay ${pricing ? formatCents(pricing.totalCents) : ''} (sandbox)`}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* ---------- right: summary ---------- */}
        <aside className="panel summary-card">
          <div className="summary-art" style={{ background: garment?.tone === 'dark' ? '#23201b' : '#efe9db' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumb} alt="Your design" width={400} height={563} />
          </div>
          <h3 style={{ fontSize: 20, marginTop: 16 }}>{design.label}</h3>
          <p className="tiny mono" style={{ marginTop: 4 }}>
            {formatCoord(design.lat, design.lon)} · {design.radiusKm} km · {palette.name} ink
          </p>
          {design.caption && <p className="small" style={{ fontStyle: 'italic', marginTop: 6 }}>“{design.caption}”</p>}
          <div className="summary-rows">
            <div className="row">
              <span className="k">Topographic Portrait Tee · {garment?.name ?? color}</span>
              <span>{sizeLabel(size)}</span>
            </div>
            <div className="row">
              <span className="k">Quantity</span>
              <span>{qty}</span>
            </div>
            <div className="row">
              <span className="k">Subtotal</span>
              <span>{formatCents(3600 * qty)}</span>
            </div>
            <div className="row">
              <span className="k">Shipping</span>
              <span>{shipping.country ? formatCents(shipping.country === 'US' ? 600 : 1400) : '—'}</span>
            </div>
            <div className="row total">
              <span>Total</span>
              <span>{formatCents(3600 * qty + (shipping.country === 'US' ? 600 : 1400))}</span>
            </div>
          </div>
          <p className="tiny" style={{ marginTop: 14 }}>
            Made to order · personalised items are final sale unless misprinted or damaged.
          </p>
        </aside>
      </main>
    </>
  );
}
