'use client';

import { useState } from 'react';
import { CardElement, useElements, useStripe } from '@stripe/react-stripe-js';
import type { StripeCardElementChangeEvent } from '@stripe/stripe-js';
import {
  SIZES,
  STYLES,
  STYLE_LABEL,
  formatUsd,
  PRICE_CENTS,
  type Size,
  type Style,
} from '@/lib/catalog';
import { renderPrintArtwork } from './Shirt';
import type { OrderOutcome } from './Store';

const CARD_STYLE = {
  style: {
    base: {
      color: '#111',
      fontSize: '16px',
      fontWeight: '400',
      lineHeight: '28px',
      fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
      '::placeholder': { color: '#ccc' },
    },
    invalid: { color: '#eb1c26', iconColor: '#eb1c26' },
  },
} as const;

interface FieldDef {
  key: keyof AddressState;
  label: string;
  placeholder: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  maxLength?: number;
}

interface AddressState {
  name: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  email: string;
}

const ADDRESS_FIELDS: FieldDef[] = [
  { key: 'name', label: 'Name', placeholder: 'Jenny Rosen', autoComplete: 'name', required: true },
  {
    key: 'address1',
    label: 'Shipping address',
    placeholder: '185 Berry St',
    autoComplete: 'address-line1',
    required: true,
  },
  {
    key: 'address2',
    label: 'Apartment or suite (optional)',
    placeholder: 'Suite 550',
    autoComplete: 'address-line2',
  },
];

const CITY_FIELDS: FieldDef[] = [
  { key: 'city', label: 'City', placeholder: 'San Francisco', autoComplete: 'address-level2', required: true },
  { key: 'state', label: 'State', placeholder: 'CA', autoComplete: 'address-level1', required: true, maxLength: 2 },
  { key: 'zip', label: 'ZIP', placeholder: '94107', autoComplete: 'postal-code', required: true, maxLength: 10 },
];

interface CheckoutFormProps {
  style: Style;
  size: Size;
  onStyleChange: (style: Style) => void;
  onSizeChange: (size: Size) => void;
  /** Freezes the shirt clock and returns the instant to print. */
  onCapture: () => number;
  onRelease: () => void;
  onComplete: (outcome: OrderOutcome) => void;
}

interface ApiIssue {
  message?: string;
}

export default function CheckoutForm({
  style,
  size,
  onStyleChange,
  onSizeChange,
  onCapture,
  onRelease,
  onComplete,
}: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();

  const [address, setAddress] = useState<AddressState>({
    name: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
    email: '',
  });
  const [cardError, setCardError] = useState<string | null>(null);
  const [cardFocused, setCardFocused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<ApiIssue[]>([]);

  const set = (key: keyof AddressState) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = key === 'state' ? event.target.value.toUpperCase() : event.target.value;
    setAddress((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;

    if (!stripe || !elements) {
      setError('Payments are still loading. Give it a second and try again.');
      return;
    }
    const card = elements.getElement(CardElement);
    if (!card) {
      setError('The card field did not load. Please refresh and try again.');
      return;
    }

    setBusy(true);
    setError(null);
    setIssues([]);

    // Freeze the clock: from here on, one exact millisecond is the product.
    const capturedAt = onCapture();

    try {
      setStatus('Rendering your artwork…');
      const artwork = await renderPrintArtwork(capturedAt);

      setStatus('Reserving your shirt…');
      const checkoutResponse = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shirt: { style, size, artwork },
          email: address.email,
          capturedAt,
          address: {
            name: address.name,
            address1: address.address1,
            address2: address.address2,
            city: address.city,
            state: address.state,
            zip: address.zip,
          },
        }),
      });

      const checkout = await checkoutResponse.json();
      if (!checkoutResponse.ok) {
        setIssues(Array.isArray(checkout.issues) ? checkout.issues : []);
        throw new Error(checkout?.error?.message ?? 'We could not start checkout.');
      }

      setStatus('Confirming your payment…');
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        checkout.clientSecret,
        {
          payment_method: {
            card,
            billing_details: {
              name: address.name,
              email: address.email,
              address: {
                line1: address.address1,
                line2: address.address2 || undefined,
                city: address.city,
                state: address.state,
                postal_code: address.zip,
                country: 'US',
              },
            },
          },
          receipt_email: address.email,
        },
      );

      if (stripeError) {
        throw new Error(stripeError.message ?? 'Your card could not be charged.');
      }
      if (paymentIntent?.status !== 'succeeded') {
        throw new Error(`Payment ended in an unexpected state (${paymentIntent?.status}).`);
      }

      setStatus('Sending your shirt to the printer…');
      const fulfillResponse = await fetch('/api/fulfill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
      });
      const fulfillment = await fulfillResponse.json();

      // Payment already succeeded, so a fulfillment hiccup is never a failed
      // purchase — the webhook will finish the job.
      onComplete({
        reference: fulfillResponse.ok
          ? fulfillment.reference
          : (checkout.reference as string),
        orderId: fulfillResponse.ok ? (fulfillment.orderId ?? null) : null,
        state: fulfillResponse.ok ? fulfillment.state : 'deferred',
        message: fulfillResponse.ok
          ? fulfillment.message
          : 'Payment captured. Your shirt is queued for printing.',
        capturedAt,
        style,
        size,
        email: address.email,
        amount: PRICE_CENTS,
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Checkout failed.');
      onRelease();
    } finally {
      setBusy(false);
      setStatus(null);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate={false}>
      {error && (
        <div className="alert alert-error" role="alert">
          {error}
          {issues.length > 0 && (
            <ul>
              {issues.map((issue, index) => (
                <li key={index}>{issue.message ?? 'Unspecified problem.'}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="form-section">
        <h3>Cut</h3>
        <div className="pills styles" role="radiogroup" aria-label="Shirt cut">
          {STYLES.map((option) => (
            <div className="pill" key={option}>
              <input
                id={`style-${option}`}
                type="radio"
                name="style"
                value={option}
                checked={style === option}
                disabled={busy}
                onChange={() => onStyleChange(option)}
              />
              <label htmlFor={`style-${option}`}>{STYLE_LABEL[option]}</label>
            </div>
          ))}
        </div>
      </div>

      <div className="form-section">
        <h3>Size</h3>
        <div className="pills sizes" role="radiogroup" aria-label="Shirt size">
          {SIZES.map((option) => (
            <div className="pill" key={option}>
              <input
                id={`size-${option}`}
                type="radio"
                name="size"
                value={option}
                checked={size === option}
                disabled={busy}
                onChange={() => onSizeChange(option)}
              />
              <label htmlFor={`size-${option}`}>{option}</label>
            </div>
          ))}
        </div>
      </div>

      {ADDRESS_FIELDS.map((field) => (
        <TextField
          key={field.key}
          field={field}
          value={address[field.key]}
          disabled={busy}
          onChange={set(field.key)}
        />
      ))}

      <div className="field-row">
        {CITY_FIELDS.map((field) => (
          <TextField
            key={field.key}
            field={field}
            value={address[field.key]}
            disabled={busy}
            onChange={set(field.key)}
          />
        ))}
      </div>

      <TextField
        field={{
          key: 'email',
          label: 'Email (for your receipt)',
          placeholder: 'jenny@example.com',
          type: 'email',
          autoComplete: 'email',
          required: true,
        }}
        value={address.email}
        disabled={busy}
        onChange={set('email')}
      />

      <div className={`field-wrap card${cardFocused ? ' is-focused' : ''}${cardError ? ' is-invalid' : ''}`}>
        <div className="stripe-mount">
          <CardElement
            options={CARD_STYLE}
            onFocus={() => setCardFocused(true)}
            onBlur={() => setCardFocused(false)}
            onChange={(event: StripeCardElementChangeEvent) =>
              setCardError(event.error?.message ?? null)
            }
          />
        </div>
        <div className="field-label">
          <span>{cardError ?? 'Card details'}</span>
        </div>
      </div>

      <button className="buy" type="submit" disabled={busy || !stripe}>
        {busy ? (
          <>
            <span className="spinner" aria-hidden="true" />
            {status ?? 'Processing…'}
          </>
        ) : (
          <>Buy now — {formatUsd(PRICE_CENTS)}</>
        )}
      </button>

      <p className="fineprint">
        Free US shipping. The datetime is captured when you press Buy.
      </p>
    </form>
  );
}

function TextField({
  field,
  value,
  disabled,
  onChange,
}: {
  field: FieldDef;
  value: string;
  disabled: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="field-wrap">
      <input
        id={`field-${field.key}`}
        className={`field${value ? '' : ' is-empty'}`}
        type={field.type ?? 'text'}
        name={field.key}
        value={value}
        placeholder={field.placeholder}
        autoComplete={field.autoComplete}
        required={field.required}
        maxLength={field.maxLength}
        disabled={disabled}
        onChange={onChange}
      />
      <label className="field-label" htmlFor={`field-${field.key}`}>
        <span>{field.label}</span>
      </label>
    </div>
  );
}
