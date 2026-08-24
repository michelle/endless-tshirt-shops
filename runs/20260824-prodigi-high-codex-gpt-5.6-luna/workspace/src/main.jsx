import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { loadStripe } from '@stripe/stripe-js';
import './styles.css';

const PRICE = 22.5;
const STYLES = {
  fitted: { name: 'Fitted', detail: 'Tailored shape · Bella+Canvas 3001' },
  unisex: { name: 'Unisex', detail: 'Classic shape · Gildan 64000' },
};
const SIZES = ['S', 'M', 'L', 'XL'];

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const pad = (value, length = 2) => String(value).padStart(length, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const pad = (value, length = 2) => String(value).padStart(length, '0');
  return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}.${pad(date.getUTCMilliseconds(), 3)}`;
}

function ProductPreview({ timestamp, style, frozen }) {
  const stamp = String(timestamp);
  return (
    <div className="product-stage">
      <div className="stage-grid" aria-hidden="true" />
      <div className="stage-label stage-label-top">SPECIMEN / 001</div>
      <div className="stage-label stage-label-bottom">PRINTED TO ORDER · UTC</div>
      <div className="shirt-wrap">
        <svg className="shirt-art" viewBox="0 0 480 590" role="img" aria-label={`Black t-shirt printed with timestamp ${stamp}`}>
          <defs>
            <linearGradient id="shirtShade" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor="#1a1b1b" />
              <stop offset="0.52" stopColor="#080909" />
              <stop offset="1" stopColor="#242625" />
            </linearGradient>
            <filter id="shirtShadow" x="-30%" y="-30%" width="160%" height="180%">
              <feGaussianBlur stdDeviation="14" />
            </filter>
          </defs>
          <ellipse cx="240" cy="562" rx="160" ry="17" fill="#172325" opacity=".18" filter="url(#shirtShadow)" />
          <path d="M150 84 76 119 17 207l62 55 40-43-8 292c36 19 77 30 129 30s93-11 129-30l-8-292 40 43 62-55-59-88-74-35c-18 29-43 45-90 45s-72-16-90-45Z" fill="url(#shirtShade)" stroke="#303332" strokeWidth="2" />
          <path d="M150 84c18 29 43 45 90 45s72-16 90-45" fill="none" stroke="#444847" strokeWidth="3" opacity=".8" />
          <path d="M143 102 91 125M337 102l52 23" stroke="#555957" strokeWidth="2" opacity=".25" />
          <text x="240" y="281" fill="#ffffff" textAnchor="middle" className="shirt-timestamp">{stamp}</text>
          <text x="240" y="312" fill="#8ee9df" textAnchor="middle" className="shirt-caption">THE MOMENT, MADE PHYSICAL</text>
        </svg>
      </div>
      <div className={`live-pill ${frozen ? 'is-frozen' : ''}`}>
        <span className="live-dot" />
        {frozen ? 'MOMENT RESERVED' : 'LIVE PREVIEW'}
      </div>
    </div>
  );
}

function ChoiceGroup({ label, value, options, onChange, descriptions, disabled = false }) {
  return (
    <fieldset className="choice-group">
      <legend>{label}</legend>
      <div className={`choice-grid choice-grid-${options.length}`}>
        {options.map((option) => (
          <label className={`choice ${value === option ? 'selected' : ''} ${disabled ? 'disabled' : ''}`} key={option}>
            <input type="radio" name={label} value={option} checked={value === option} onChange={onChange} disabled={disabled} />
            <span>{descriptions?.[option] || option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Field({ label, name, value, onChange, type = 'text', placeholder, autoComplete, required = true, children }) {
  return (
    <label className="field-label">
      <span>{label}</span>
      {children || (
        <input
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
        />
      )}
    </label>
  );
}

function App() {
  const [now, setNow] = useState(() => Date.now());
  const [selectedStyle, setSelectedStyle] = useState('fitted');
  const [selectedSize, setSelectedSize] = useState('M');
  const [reservedAt, setReservedAt] = useState(null);
  const [step, setStep] = useState('details');
  const [config, setConfig] = useState(null);
  const [stripe, setStripe] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [paymentIntentId, setPaymentIntentId] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(null);
  const [customer, setCustomer] = useState({
    name: '', email: '', line1: '', line2: '', city: '', state: '', postalCode: '', country: 'US',
  });
  const paymentRef = useRef(null);
  const elementsRef = useRef(null);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 47);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    fetch('/api/config')
      .then((response) => response.json())
      .then(async (payload) => {
        setConfig(payload);
        if (payload.publishableKey) setStripe(await loadStripe(payload.publishableKey));
      })
      .catch(() => setConfig({ paymentsConfigured: false, fulfillmentConfigured: false }));
  }, []);

  useEffect(() => {
    if (!stripe || !clientSecret || !paymentRef.current) return undefined;
    const elements = stripe.elements({
      clientSecret,
      appearance: {
        theme: 'stripe',
        variables: { colorPrimary: '#0e3336', colorText: '#102326', colorTextSecondary: '#718083', borderRadius: '2px', fontFamily: 'DM Sans, sans-serif' },
        rules: { '.Input': { border: '1px solid #cdd6d4', boxShadow: 'none', padding: '13px' }, '.Input:focus': { border: '1px solid #0e3336', boxShadow: '0 0 0 1px #0e3336' }, '.Label': { fontSize: '12px' } },
      },
    });
    const paymentElement = elements.create('payment', { layout: 'tabs' });
    paymentElement.mount(paymentRef.current);
    elementsRef.current = elements;
    return () => {
      paymentElement.unmount();
      elementsRef.current = null;
    };
  }, [stripe, clientSecret]);

  const displayTimestamp = reservedAt || now;
  const product = STYLES[selectedStyle];
  const orderSummary = useMemo(() => `${product.name} / ${selectedSize}`, [product.name, selectedSize]);

  function updateCustomer(event) {
    const { name, value } = event.target;
    setCustomer((current) => ({ ...current, [name]: value }));
  }

  async function beginPayment(event) {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    setBusy(true);
    setError('');
    const timestamp = Date.now();
    try {
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ style: selectedStyle, size: selectedSize, timestamp, email: customer.email }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message || 'Could not start checkout.');
      setReservedAt(timestamp);
      setClientSecret(payload.clientSecret);
      setPaymentIntentId(payload.paymentIntentId);
      setStep('payment');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function completePurchase(event) {
    event.preventDefault();
    if (!stripe || !elementsRef.current || !paymentIntentId) return;
    setBusy(true);
    setError('');
    try {
      const { error: submitError } = await elementsRef.current.submit();
      if (submitError) throw submitError;
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({ elements: elementsRef.current, clientSecret, redirect: 'if_required' });
      if (confirmError) throw confirmError;
      if (paymentIntent?.status !== 'succeeded') throw new Error('Payment needs another step before it can be completed.');
      const response = await fetch('/api/fulfill-order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentIntentId, customer: { name: customer.name, email: customer.email, address: { line1: customer.line1, line2: customer.line2, city: customer.city, state: customer.state, postalCode: customer.postalCode, country: customer.country } } }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message || 'The order could not be sent to fulfillment.');
      setSuccess(payload);
      setStep('success');
    } catch (requestError) {
      setError(requestError.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  function resetShop() {
    setReservedAt(null); setClientSecret(null); setPaymentIntentId(null); setSuccess(null); setStep('details'); setError('');
  }

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="datetime.store home"><span>datetime</span><i>.</i><span>store</span></a>
        <div className="header-meta"><span>OBJECT 001</span><span className="header-rule" /><span>EST. 2017</span></div>
      </header>

      <main>
        <section className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> A SMALL SHOP FOR A VERY SPECIFIC MOMENT</div>
          <h1>Wear the<br /><em>moment.</em></h1>
          <p className="hero-description">A black tee printed with the exact date and time you order it. No two are alike. Each one is made only when you press the button.</p>
        </section>

        <section className="shop-layout" aria-label="Purchase datetime shirt">
          <div className="preview-column">
            <ProductPreview timestamp={displayTimestamp} style={selectedStyle} frozen={Boolean(reservedAt)} />
            <div className="preview-footnote"><span>YOUR TIMESTAMP</span><strong>{formatDate(displayTimestamp)} <b>{formatTime(displayTimestamp)} UTC</b></strong></div>
          </div>

          <div className="purchase-panel">
            {step === 'success' ? (
              <div className="success-state">
                <div className="success-mark">✓</div>
                <div className="eyebrow"><span className="eyebrow-line" /> ORDER CONFIRMED</div>
                <h2>Your moment is<br /><em>in motion.</em></h2>
                <p>We sent your timestamp to our print partner. A confirmation will arrive at <strong>{customer.email}</strong> shortly.</p>
                <div className="order-number"><span>FULFILLMENT REFERENCE</span><strong>{success?.orderId || '—'}</strong></div>
                <button className="secondary-button" type="button" onClick={resetShop}>Make another one <span>↗</span></button>
              </div>
            ) : (
              <>
                <div className="panel-heading"><div><span className="section-number">01</span><h2>Make it yours</h2></div><span className="price">${PRICE.toFixed(2)}</span></div>
                <p className="panel-intro">Choose a shape and size. The time shown above is the one we’ll print.</p>
                <ChoiceGroup label="Cut" value={selectedStyle} options={Object.keys(STYLES)} onChange={(event) => setSelectedStyle(event.target.value)} descriptions={{ fitted: 'Fitted', unisex: 'Unisex' }} disabled={Boolean(reservedAt)} />
                <div className="choice-detail">{product.detail}</div>
                <ChoiceGroup label="Size" value={selectedSize} options={SIZES} onChange={(event) => setSelectedSize(event.target.value)} disabled={Boolean(reservedAt)} />

                {step === 'details' ? (
                  <form className="details-form" onSubmit={beginPayment}>
                    <div className="form-divider"><span>SHIPPING DETAILS</span></div>
                    <div className="form-grid"><Field label="Full name" name="name" value={customer.name} onChange={updateCustomer} placeholder="Ada Lovelace" autoComplete="name" /><Field label="Email for receipt" name="email" value={customer.email} onChange={updateCustomer} type="email" placeholder="you@example.com" autoComplete="email" /></div>
                    <Field label="Address" name="line1" value={customer.line1} onChange={updateCustomer} placeholder="1 Infinite Loop" autoComplete="shipping address-line1" />
                    <Field label="Apartment, suite, etc. (optional)" name="line2" value={customer.line2} onChange={updateCustomer} placeholder="" autoComplete="shipping address-line2" required={false} />
                    <div className="form-grid form-grid-three"><Field label="City" name="city" value={customer.city} onChange={updateCustomer} placeholder="San Francisco" autoComplete="shipping address-level2" /><Field label="State" name="state" value={customer.state} onChange={updateCustomer} placeholder="CA" autoComplete="shipping address-level1" /><Field label="ZIP" name="postalCode" value={customer.postalCode} onChange={updateCustomer} placeholder="94107" autoComplete="shipping postal-code" /></div>
                    <button className="primary-button" type="submit" disabled={busy || config?.paymentsConfigured === false}>{busy ? 'Opening secure checkout…' : 'Continue to payment'} <span>→</span></button>
                    {config?.paymentsConfigured === false && <p className="config-note">Checkout is being configured. Add Stripe keys to enable purchases.</p>}
                  </form>
                ) : (
                  <form className="payment-form" onSubmit={completePurchase}>
                    <div className="form-divider"><span>SECURE PAYMENT</span><span className="secure-note">⌁ Stripe encrypted</span></div>
                    <div className="payment-summary"><span>{orderSummary}</span><strong>${PRICE.toFixed(2)} USD</strong></div>
                    <div className="stripe-element" ref={paymentRef} />
                    <button className="primary-button" type="submit" disabled={busy || !stripe}>{busy ? 'Processing your order…' : `Buy shirt · $${PRICE.toFixed(2)}`} <span>→</span></button>
                    <button className="back-button" type="button" onClick={() => { setStep('details'); setClientSecret(null); setPaymentIntentId(null); setReservedAt(null); setError(''); }}>← Edit details</button>
                  </form>
                )}
                {error && <div className="error-message" role="alert">{error}</div>}
                <div className="shipping-note"><span>✦</span><div><strong>Free shipping, always.</strong><br />Made to order and sent from our print partner. Estimated arrival: 7–10 business days.</div></div>
              </>
            )}
          </div>
        </section>

        <section className="manifesto"><span className="manifesto-index">/ 02</span><p>There is no “perfect time.”<br /><em>There is only this one.</em></p><span className="manifesto-mark">⌁</span></section>
      </main>
      <footer className="site-footer"><span>datetime.store</span><span>Made for right now.</span><a href="mailto:hello@datetime.store">Questions? Say hello ↗</a></footer>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
