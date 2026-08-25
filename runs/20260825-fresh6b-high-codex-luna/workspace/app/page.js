'use client';

import { useEffect, useMemo, useState } from 'react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const PRICE = 2250;
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = PUBLISHABLE_KEY ? loadStripe(PUBLISHABLE_KEY) : null;

function pad(value, length = 2) {
  return String(value).padStart(length, '0');
}

function formatStamp(timestamp) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
}

function TimestampArtwork({ timestamp, frozen = false }) {
  const [now, setNow] = useState(timestamp);

  useEffect(() => {
    if (frozen) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 47);
    return () => window.clearInterval(timer);
  }, [frozen]);

  const value = frozen ? timestamp : now;
  return (
    <div className="artwork" aria-label={`Current time ${formatStamp(value)}`}>
      <div className="artwork-meta">LOCAL TIME / 01</div>
      <div className="artwork-time">{formatStamp(value)}</div>
      <div className="artwork-rule" />
      <div className="artwork-caption">THIS MOMENT WILL PASS</div>
    </div>
  );
}

function ShirtPreview({ style, timestamp, frozen = false }) {
  return (
    <div className={`shirt-stage ${style}`}>
      <div className="shirt-shadow" />
      <svg className="shirt-svg" viewBox="0 0 420 490" role="img" aria-label={`${style} black datetime t-shirt`}>
        <path d="M129 58 52 94 12 163l67 54 28-31 7 271h192l7-271 28 31 67-54-40-69-77-36c-10 26-28 41-54 41s-44-15-54-41Z" />
        <path className="shirt-neck" d="M148 61c8 25 25 39 55 39s47-14 55-39" />
        <path className="shirt-seam" d="M106 185c13 31 17 103 8 178M314 185c-13 31-17 103-8 178" />
      </svg>
      <div className="shirt-print"><TimestampArtwork timestamp={timestamp} frozen={frozen} /></div>
      <div className="price-tag"><span className="old-price">$30</span> $22.50</div>
    </div>
  );
}

function ChoiceGroup({ label, options, value, onChange }) {
  return (
    <fieldset className="choice-group">
      <legend>{label}</legend>
      <div className="choices">
        {options.map((option) => (
          <button
            type="button"
            key={option.value}
            className={`choice ${value === option.value ? 'selected' : ''}`}
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Field({ label, name, value, onChange, type = 'text', required = true, placeholder }) {
  return (
    <label className="field-label">
      <span>{label}{required ? ' *' : ''}</span>
      <input name={name} value={value} onChange={onChange} type={type} required={required} placeholder={placeholder} autoComplete={name} />
    </label>
  );
}

function CheckoutForm({ style, size, paymentIntentId, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [details, setDetails] = useState({ name: '', address: '', apartment: '', city: '', state: '', postalCode: '', email: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const update = (event) => setDetails((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setError('');
    const timestamp = Date.now();
    const prepare = await fetch('/api/prepare-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ style, size, timestamp, details: { ...details, paymentIntentId } }),
    });
    const prepared = await prepare.json();
    if (!prepare.ok) {
      setError(prepared.error || 'We could not prepare your order.');
      setBusy(false);
      return;
    }

    const result = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });
    if (result.error) {
      setError(result.error.message || 'Payment could not be completed.');
      setBusy(false);
      return;
    }

    const fulfillment = await fetch('/api/confirm-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentIntentId: prepared.paymentIntentId }),
    });
    const order = await fulfillment.json();
    if (!fulfillment.ok) {
      setError(order.error || 'Your payment went through, but we need to finish the print order. Please contact hello@datetime.store.');
      setBusy(false);
      return;
    }
    onSuccess({ ...order, timestamp });
  };

  return (
    <form className="checkout-form" onSubmit={submit}>
      <div className="form-grid">
        <Field label="Name" name="name" value={details.name} onChange={update} placeholder="Jane Doe" />
        <Field label="Email for receipt" name="email" type="email" value={details.email} onChange={update} placeholder="jane@example.com" />
        <div className="full"><Field label="Shipping address" name="address" value={details.address} onChange={update} placeholder="123 Main Street" /></div>
        <div className="full"><Field label="Apartment or suite" name="apartment" required={false} value={details.apartment} onChange={update} placeholder="Optional" /></div>
        <Field label="City" name="city" value={details.city} onChange={update} placeholder="San Francisco" />
        <Field label="State" name="state" value={details.state} onChange={update} placeholder="CA" />
        <Field label="ZIP code" name="postalCode" value={details.postalCode} onChange={update} placeholder="94107" />
      </div>
      <div className="payment-box">
        <div className="payment-heading"><span>Payment details</span><span className="secure-mark">⌁ secure</span></div>
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="buy-button" type="submit" disabled={busy || !stripe}>
        {busy ? 'Processing your order…' : `Buy now · $22.50`}
      </button>
      <p className="fine-print">Free shipping · Printed to order · 30-day returns</p>
    </form>
  );
}

function Checkout({ style, size, onSuccess }) {
  const [clientSecret, setClientSecret] = useState('');
  const [paymentIntentId, setPaymentIntentId] = useState('');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ style, size }),
    }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to start checkout.');
      if (active) {
        setClientSecret(data.clientSecret);
        setPaymentIntentId(data.paymentIntentId);
      }
    }).catch((error) => active && setLoadError(error.message));
    return () => { active = false; };
  }, []);

  if (!PUBLISHABLE_KEY) return <p className="form-error">Stripe test mode is not configured yet. Add a publishable key to continue.</p>;
  if (loadError) return <p className="form-error">{loadError}</p>;
  if (!clientSecret) return <div className="checkout-loading"><span className="spinner" /> Opening secure checkout…</div>;

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe', variables: { colorPrimary: '#0f172a', borderRadius: '0px', fontFamily: 'inherit' } } }}>
      <CheckoutForm style={style} size={size} paymentIntentId={paymentIntentId} onSuccess={onSuccess} />
    </Elements>
  );
}

export default function Home() {
  const [style, setStyle] = useState('fitted');
  const [size, setSize] = useState('M');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [success, setSuccess] = useState(null);
  const previewTimestamp = useMemo(() => Date.now(), []);

  if (success) {
    return (
      <main className="success-page">
        <div className="success-mark">✓</div>
        <p className="eyebrow">ORDER CONFIRMED · {success.orderId || 'THANK YOU'}</p>
        <h1>Your moment is<br /><em>in motion.</em></h1>
        <p className="success-copy">Your datetime tee is being prepared just for you. We sent a receipt to your inbox, and we’ll follow up when it ships.</p>
        <div className="success-time"><span>PRINTED MOMENT</span><strong>{formatStamp(success.timestamp)}</strong></div>
        <button className="secondary-button" onClick={() => setSuccess(null)}>Get another shirt</button>
      </main>
    );
  }

  return (
    <main>
      <header className="site-header">
        <a className="wordmark" href="/">datetime<span>.</span>store</a>
        <div className="header-note"><span className="live-dot" /> made in real time</div>
      </header>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">THE ORIGINAL CURRENT-TIME TEE</p>
          <h1>A shirt for<br /><em>right now.</em></h1>
          <p className="lede">One timestamp. One soft black tee.<br />The moment you order becomes the moment you wear.</p>
          <div className="product-details"><span>01 / 03</span><span>Printed in the USA</span><span>Free shipping</span></div>
        </div>
        <div className="preview-wrap">
          <div className="preview-label">LIVE PREVIEW <span /> UPDATES EVERY 47MS</div>
          <ShirtPreview style={style} timestamp={previewTimestamp} />
        </div>
      </section>
      <section className="shop-section" id="shop">
        <div className="shop-intro"><span className="section-number">01</span><h2>Make it yours.</h2><p>Choose your cut and size. The clock does the rest.</p></div>
        <div className="shop-panel">
          <ChoiceGroup label="Cut" value={style} onChange={setStyle} options={[{ value: 'fitted', label: 'Fitted' }, { value: 'unisex', label: 'Unisex' }]} />
          <ChoiceGroup label="Size" value={size} onChange={setSize} options={['S', 'M', 'L', 'XL'].map((value) => ({ value, label: value }))} />
          <div className="order-total"><span>datetime tee / {style} / {size}</span><strong>$22.50</strong></div>
          {!checkoutOpen ? (
            <button className="buy-button" type="button" onClick={() => setCheckoutOpen(true)}>Continue to checkout <span>↗</span></button>
          ) : (
            <Checkout style={style} size={size} onSuccess={setSuccess} />
          )}
        </div>
      </section>
      <footer className="site-footer"><span>© datetime.store</span><span>Every order is one of one.</span><a href="mailto:hello@datetime.store">Questions? hello@datetime.store</a></footer>
    </main>
  );
}
