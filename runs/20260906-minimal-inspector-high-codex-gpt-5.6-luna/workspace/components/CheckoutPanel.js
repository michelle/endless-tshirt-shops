'use client';

import { useEffect, useState } from 'react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

const emptyDetails = { name: '', email: '', address1: '', address2: '', city: '', state: '', zip: '', country: 'US' };

function DetailField({ label, name, value, onChange, type = 'text', required = true, autoComplete }) {
  return <label className="field-label"><span>{label}{required ? ' *' : ''}</span><input name={name} type={type} value={value} onChange={onChange} required={required} autoComplete={autoComplete || name} /></label>;
}

function PaymentStep({ paymentIntentId, onBack, onLockChange }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    onLockChange(submitting);
  }, [onLockChange, submitting]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError('');
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/success?payment_intent=${paymentIntentId}` },
      redirect: 'if_required',
    });
    if (result.error) {
      setError(result.error.message || 'Payment could not be completed.');
      setSubmitting(false);
      return;
    }
    window.location.assign(`/success?payment_intent=${paymentIntentId}`);
  }

  return <form className="payment-step" onSubmit={handleSubmit}>
    <div className="payment-step-heading"><span>03</span><strong>PAYMENT</strong><button type="button" onClick={onBack}>EDIT</button></div>
    <PaymentElement options={{ layout: 'tabs' }} />
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="pay-button" type="submit" disabled={!stripe || submitting}>{submitting ? 'SECURING YOUR MOMENT…' : 'PAY $22.50'}</button>
    <p className="secure-note">Secure checkout via Stripe · no card data touches this site.</p>
  </form>;
}

export default function CheckoutPanel({ style, size, onLockChange }) {
  const [details, setDetails] = useState(emptyDetails);
  const [clientSecret, setClientSecret] = useState('');
  const [paymentIntentId, setPaymentIntentId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setDetails((current) => ({ ...current, [name]: value }));
  }

  async function beginPayment(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    onLockChange(true);
    try {
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...details, style, size }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not start checkout.');
      setClientSecret(payload.clientSecret);
      setPaymentIntentId(payload.paymentIntentId);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
      onLockChange(false);
    }
  }

  function goBack() {
    setClientSecret('');
    setPaymentIntentId('');
    setError('');
  }

  if (clientSecret && stripePromise) {
    return <Elements key={clientSecret} stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe', variables: { colorPrimary: '#111111', borderRadius: '0px', fontFamily: 'Arial, sans-serif' } } }}><PaymentStep paymentIntentId={paymentIntentId} onBack={goBack} onLockChange={onLockChange} /></Elements>;
  }

  return <form className="details-form" onSubmit={beginPayment}>
    <div className="payment-step-heading"><span>03</span><strong>SHIPPING + PAYMENT</strong></div>
    <DetailField label="Name" name="name" value={details.name} onChange={handleChange} autoComplete="name" />
    <DetailField label="Email" name="email" type="email" value={details.email} onChange={handleChange} autoComplete="email" />
    <DetailField label="Address" name="address1" value={details.address1} onChange={handleChange} autoComplete="address-line1" />
    <DetailField label="Apartment or suite" name="address2" value={details.address2} onChange={handleChange} required={false} autoComplete="address-line2" />
    <div className="field-row"><DetailField label="City" name="city" value={details.city} onChange={handleChange} autoComplete="address-level2" /><DetailField label="State" name="state" value={details.state} onChange={handleChange} autoComplete="address-level1" /></div>
    <DetailField label="Postal code" name="zip" value={details.zip} onChange={handleChange} autoComplete="postal-code" />
    {error && <p className="form-error" role="alert">{error}</p>}
    {!publishableKey && <p className="form-error">Stripe test mode is not configured yet.</p>}
    <button className="pay-button" type="submit" disabled={loading || !publishableKey}>{loading ? 'PREPARING CHECKOUT…' : 'CONTINUE TO PAYMENT'}</button>
    <p className="secure-note">Free US shipping · 5–8 business days · test mode enabled</p>
  </form>;
}
