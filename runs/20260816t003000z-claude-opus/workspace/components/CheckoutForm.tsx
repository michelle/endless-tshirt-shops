'use client';

import { CardElement, useElements, useStripe } from '@stripe/react-stripe-js';
import type { StripeCardElementChangeEvent } from '@stripe/stripe-js';
import { Fragment, useState } from 'react';
import {
  SIZE_KEYS,
  STYLE_KEYS,
  STYLES,
  formatUsd,
  PRICE_CENTS,
  type Size,
  type Style,
} from '@/lib/catalog';
import { renderPrintArtwork } from '@/lib/artwork';

/** Matches the hairline-underline fields around it. */
const CARD_ELEMENT_STYLE = {
  style: {
    base: {
      fontSize: '16px',
      fontWeight: '400',
      lineHeight: '28px',
      color: '#111111',
      fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
      '::placeholder': { color: '#cccccc' },
    },
    invalid: { color: '#eb1c26', iconColor: '#eb1c26' },
  },
} as const;

export interface CompletedOrder {
  reference: string;
  orderId: string;
  live: boolean;
  timestamp: number;
  style: Style;
  size: Size;
  email: string;
}

interface Props {
  style: Style;
  size: Size;
  onStyleChange: (style: Style) => void;
  onSizeChange: (size: Size) => void;
  /** Freezes the shirt preview while payment is in flight. */
  onFreeze: (timestamp: number | null) => void;
  onComplete: (order: CompletedOrder) => void;
  /** CSS font-family used for the printed artwork. */
  printFontFamily: string;
}

type Fields = {
  name: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  email: string;
};

const EMPTY: Fields = {
  name: '',
  address1: '',
  address2: '',
  city: '',
  state: '',
  zip: '',
  email: '',
};

export default function CheckoutForm(props: Props) {
  const stripe = useStripe();
  const elements = useElements();

  const [fields, setFields] = useState<Fields>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [cardState, setCardState] = useState({ focused: false, filled: false });
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<string[]>([]);

  const set = (key: keyof Fields) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setFields((prev) => ({ ...prev, [key]: event.target.value }));

  const handleCardChange = (event: StripeCardElementChangeEvent) => {
    setCardError(event.error?.message ?? null);
    setCardState({ focused: cardState.focused, filled: !event.empty });
  };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting || !stripe || !elements) return;

    const card = elements.getElement(CardElement);
    if (!card) return;

    setError(null);
    setIssues([]);
    setSubmitting(true);

    // This is the instant the customer bought. Everything downstream uses it.
    const timestamp = Date.now();
    props.onFreeze(timestamp);

    try {
      const artwork = await renderPrintArtwork(timestamp, props.printFontFamily);

      // 1. Upload artwork, quote the print job, open a PaymentIntent.
      const quoteRes = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shirt: { style: props.style, size: props.size, timestamp, artwork },
          email: fields.email,
          address: {
            name: fields.name,
            address1: fields.address1,
            address2: fields.address2,
            city: fields.city,
            state: fields.state,
            zip: fields.zip,
          },
        }),
      });
      const quote = await quoteRes.json();
      if (!quoteRes.ok) {
        throw new CheckoutError(
          quote?.error?.message ?? 'We could not start checkout.',
          (quote?.issues ?? []).map((i: { message?: string }) => i?.message).filter(Boolean),
        );
      }

      // 2. Charge the card.
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        quote.clientSecret,
        {
          payment_method: {
            card,
            billing_details: {
              name: fields.name,
              email: fields.email,
              address: {
                line1: fields.address1,
                line2: fields.address2 || undefined,
                city: fields.city,
                state: fields.state,
                postal_code: fields.zip,
                country: 'US',
              },
            },
          },
        },
      );
      if (stripeError) {
        throw new CheckoutError(
          stripeError.message ?? 'Your card could not be charged. Nothing was charged.',
        );
      }
      if (paymentIntent?.status !== 'succeeded') {
        throw new CheckoutError('Your payment did not complete. Please try again.');
      }

      // 3. Send it to production.
      const orderRes = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
      });
      const order = await orderRes.json();
      if (!orderRes.ok) {
        throw new CheckoutError(
          order?.error?.message ?? 'Your payment succeeded but the order did not go through.',
          (order?.issues ?? []).map((i: { message?: string }) => i?.message).filter(Boolean),
        );
      }

      props.onComplete({
        reference: order.reference,
        orderId: order.orderId,
        live: Boolean(order.live),
        timestamp,
        style: props.style,
        size: props.size,
        email: fields.email,
      });
    } catch (err) {
      const message =
        err instanceof CheckoutError
          ? err.message
          : 'Something went wrong. Please try again — you have not been charged twice.';
      setError(message);
      setIssues(err instanceof CheckoutError ? err.issues : []);
      setSubmitting(false);
      // Let the clock run again so the next attempt gets a fresh timestamp.
      props.onFreeze(null);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      {error && (
        <div className="alert" role="alert">
          {error}
          {issues.length > 0 && (
            <ul>
              {issues.map((issue, i) => (
                <li key={i}>{issue}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="pickers">
        <div className="picker" role="radiogroup" aria-label="Shirt style">
          {STYLE_KEYS.map((style) => (
            <Fragment key={style}>
              <input
                type="radio"
                id={`style-${style}`}
                name="style"
                value={style}
                checked={props.style === style}
                onChange={() => props.onStyleChange(style)}
                disabled={submitting}
              />
              <label htmlFor={`style-${style}`}>{STYLES[style].label}</label>
            </Fragment>
          ))}
        </div>

        <div className="picker" role="radiogroup" aria-label="Shirt size">
          {SIZE_KEYS.map((size) => (
            <Fragment key={size}>
              <input
                type="radio"
                id={`size-${size}`}
                name="size"
                value={size}
                checked={props.size === size}
                onChange={() => props.onSizeChange(size)}
                disabled={submitting}
              />
              <label htmlFor={`size-${size}`}>{size}</label>
            </Fragment>
          ))}
        </div>
      </div>

      <Field
        label="Name"
        name="name"
        autoComplete="name"
        placeholder="Jenny Rosen"
        value={fields.name}
        onChange={set('name')}
        disabled={submitting}
        required
      />
      <Field
        label="Shipping address"
        name="address1"
        autoComplete="address-line1"
        placeholder="185 Berry St"
        value={fields.address1}
        onChange={set('address1')}
        disabled={submitting}
        required
      />
      <Field
        label="Apartment or suite (optional)"
        name="address2"
        autoComplete="address-line2"
        placeholder="Suite 550"
        value={fields.address2}
        onChange={set('address2')}
        disabled={submitting}
      />

      <div className="field-grid">
        <Field
          label="City"
          name="city"
          autoComplete="address-level2"
          placeholder="San Francisco"
          value={fields.city}
          onChange={set('city')}
          disabled={submitting}
          required
        />
        <Field
          label="State"
          name="state"
          autoComplete="address-level1"
          placeholder="CA"
          maxLength={2}
          value={fields.state}
          onChange={set('state')}
          disabled={submitting}
          required
        />
        <Field
          label="Postal code"
          name="zip"
          autoComplete="postal-code"
          inputMode="numeric"
          placeholder="94107"
          value={fields.zip}
          onChange={set('zip')}
          disabled={submitting}
          required
        />
      </div>

      <Field
        label="Email (for your receipt)"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="jenny@example.com"
        value={fields.email}
        onChange={set('email')}
        disabled={submitting}
        required
      />

      <div className={`field-row${cardError ? ' is-invalid' : ''}`}>
        <div
          className={`stripe-field${cardState.focused ? ' is-focused' : ''}${
            cardState.filled ? ' is-filled' : ''
          }`}
        >
          <CardElement
            options={{ ...CARD_ELEMENT_STYLE, disabled: submitting, hidePostalCode: true }}
            onChange={handleCardChange}
            onFocus={() => setCardState((s) => ({ ...s, focused: true }))}
            onBlur={() => setCardState((s) => ({ ...s, focused: false }))}
          />
        </div>
        <span className="field-label">
          <span>{cardError ?? 'Card details'}</span>
        </span>
      </div>

      <button className="submit" type="submit" disabled={submitting}>
        {submitting ? (
          <>
            <span className="spinner" aria-hidden="true" />
            Processing…
          </>
        ) : (
          <>Buy now · {formatUsd(PRICE_CENTS)}</>
        )}
      </button>

      <p className="fineprint">
        Free shipping in the US. Printed to order, so no returns on the timestamp — it is,
        unavoidably, one of a kind.
      </p>
    </form>
  );
}

class CheckoutError extends Error {
  constructor(
    message: string,
    readonly issues: string[] = [],
  ) {
    super(message);
  }
}

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  value: string;
}

function Field({ label, value, ...rest }: FieldProps) {
  return (
    <label className="field-row">
      <input className={`field${value ? '' : ' is-empty'}`} value={value} {...rest} />
      <span className="field-label">
        <span>{label}</span>
      </span>
    </label>
  );
}
