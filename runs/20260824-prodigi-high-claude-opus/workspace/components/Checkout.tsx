'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  AddressElement,
  Elements,
  ExpressCheckoutElement,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import type { StripeAddressElement } from '@stripe/stripe-js';
import {
  CURRENCY,
  PRICE_CENTS,
  SHIPPING_COUNTRIES,
  SHIRT_SIZES,
  SHIRT_STYLES,
  STYLES,
  formatUsd,
  type ShirtSize,
  type ShirtStyle,
} from '@/lib/catalog';
import { APPEARANCE, PUBLISHABLE_KEY, stripeJs } from '@/lib/stripe-client';

/**
 * Checkout.
 *
 * Uses Stripe's *deferred* intent creation: the Payment Element mounts with no
 * PaymentIntent, and the intent is created at submit time. That matters here
 * because the PaymentIntent carries the timestamp that gets printed, and the
 * timestamp has to be the moment the customer committed — not the moment the
 * page happened to load.
 *
 * Two Elements groups, deliberately: the Express Checkout Element (Apple Pay /
 * Google Pay / Link — the descendant of the original store's paymentRequestButton)
 * and the card form each call `elements.submit()`, which validates every element
 * in its group. Keeping them separate stops an untouched card form from blocking
 * a wallet payment.
 */

type Selection = { style: ShirtStyle; size: ShirtSize };

type Props = Selection & {
  onStyleChange: (style: ShirtStyle) => void;
  onSizeChange: (size: ShirtSize) => void;
  /** Called with the millisecond the purchase was committed. */
  onFreeze: (timestampMs: number | null) => void;
};

const ELEMENTS_OPTIONS = {
  mode: 'payment' as const,
  amount: PRICE_CENTS,
  currency: CURRENCY,
  appearance: APPEARANCE,
  paymentMethodTypes: undefined,
};

async function createIntent(input: {
  style: ShirtStyle;
  size: ShirtSize;
  timestampMs: number;
  email?: string;
}): Promise<{ clientSecret: string; timestampMs: number }> {
  const response = await fetch('/api/payment-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.clientSecret) {
    throw new Error(payload.error ?? 'Could not start checkout. Please try again.');
  }
  return payload;
}

function returnUrl(): string {
  return `${window.location.origin}/order`;
}

/**
 * Stripe's element values use `line2: string | null` while confirm params want
 * `string | undefined`. Normalize once rather than at every call site.
 */
function toAddressParam(address: {
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}) {
  return {
    line1: address.line1,
    line2: address.line2 ?? undefined,
    city: address.city,
    state: address.state,
    postal_code: address.postal_code,
    country: address.country,
  };
}

/* ------------------------------------------------------------------ pickers */

function Pickers({ style, size, onStyleChange, onSizeChange, disabled }: Selection & {
  onStyleChange: (style: ShirtStyle) => void;
  onSizeChange: (size: ShirtSize) => void;
  disabled: boolean;
}) {
  return (
    <>
      <p className="picker-legend">Cut</p>
      <div className="picker" data-cols="2">
        {SHIRT_STYLES.map((value) => (
          <div key={value} style={{ position: 'relative' }}>
            <input
              id={`style-${value}`}
              type="radio"
              name="style"
              value={value}
              checked={style === value}
              disabled={disabled}
              onChange={() => onStyleChange(value)}
            />
            <label htmlFor={`style-${value}`}>{STYLES[value].label}</label>
          </div>
        ))}
      </div>

      <p className="picker-legend" style={{ marginTop: 16 }}>
        Size
      </p>
      <div className="picker" data-cols="4">
        {SHIRT_SIZES.map((value) => (
          <div key={value} style={{ position: 'relative' }}>
            <input
              id={`size-${value}`}
              type="radio"
              name="size"
              value={value}
              checked={size === value}
              disabled={disabled}
              onChange={() => onSizeChange(value)}
            />
            <label htmlFor={`size-${value}`}>{value}</label>
          </div>
        ))}
      </div>
    </>
  );
}

/* ------------------------------------------------------- express (wallets) */

function ExpressLane({
  selection,
  onFreeze,
  onError,
  onAvailability,
}: {
  selection: Selection;
  onFreeze: (ms: number | null) => void;
  onError: (message: string | null) => void;
  onAvailability: (available: boolean) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();

  const lineItems = [{ name: 'datetime tee', amount: PRICE_CENTS }];

  return (
    <ExpressCheckoutElement
      options={{ buttonHeight: 50, layout: { maxColumns: 1, maxRows: 3 } }}
      onReady={(event) => {
        onAvailability(Boolean(event.availablePaymentMethods));
      }}
      onClick={({ resolve }) => {
        resolve({
          emailRequired: true,
          phoneNumberRequired: false,
          shippingAddressRequired: true,
          allowedShippingCountries: [...SHIPPING_COUNTRIES],
          lineItems,
          shippingRates: [
            { id: 'free', displayName: 'Free shipping', amount: 0 },
          ],
        });
      }}
      onShippingAddressChange={({ resolve }) => {
        // Free shipping everywhere we ship, so nothing to recalculate.
        resolve({ lineItems });
      }}
      onCancel={() => {
        onFreeze(null);
      }}
      onConfirm={async (event) => {
        if (!stripe || !elements) return;
        onError(null);

        const { error: submitError } = await elements.submit();
        if (submitError) {
          onError(submitError.message ?? 'Could not submit payment details.');
          event.paymentFailed({ reason: 'fail' });
          return;
        }

        // This is the shirt.
        const timestampMs = Date.now();
        onFreeze(timestampMs);

        try {
          const { clientSecret } = await createIntent({
            ...selection,
            timestampMs,
            email: event.billingDetails?.email ?? undefined,
          });

          const shipping = event.shippingAddress;
          const { error } = await stripe.confirmPayment({
            elements,
            clientSecret,
            confirmParams: {
              return_url: returnUrl(),
              ...(shipping
                ? {
                    shipping: {
                      name: shipping.name,
                      address: toAddressParam(shipping.address),
                    },
                  }
                : {}),
            },
          });

          if (error) {
            onError(error.message ?? 'Payment failed.');
            onFreeze(null);
            event.paymentFailed({ reason: 'fail' });
          }
        } catch (error) {
          onError(error instanceof Error ? error.message : 'Payment failed.');
          onFreeze(null);
          event.paymentFailed({ reason: 'fail' });
        }
      }}
    />
  );
}

/* --------------------------------------------------------------- card form */

function CardForm({
  selection,
  onFreeze,
}: {
  selection: Selection;
  onFreeze: (ms: number | null) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addressRef = useRef<StripeAddressElement | null>(null);

  const submit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!stripe || !elements || busy) return;

      setBusy(true);
      setError(null);

      try {
        const { error: submitError } = await elements.submit();
        if (submitError) {
          setError(submitError.message ?? 'Please check the details above.');
          return;
        }

        const address = await elements.getElement('address')?.getValue();
        if (!address?.complete) {
          setError('Please complete your shipping address.');
          return;
        }

        // This is the shirt.
        const timestampMs = Date.now();
        onFreeze(timestampMs);

        const { clientSecret } = await createIntent({
          ...selection,
          timestampMs,
          email: email.trim() || undefined,
        });

        const { error: confirmError } = await stripe.confirmPayment({
          elements,
          clientSecret,
          confirmParams: {
            return_url: returnUrl(),
            receipt_email: email.trim() || undefined,
            shipping: {
              name: address.value.name,
              phone: address.value.phone ?? undefined,
              address: toAddressParam(address.value.address),
            },
          },
        });

        // Reaching here means no redirect happened, i.e. something went wrong.
        if (confirmError) {
          setError(confirmError.message ?? 'Payment failed. Your card was not charged.');
          onFreeze(null);
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Something went wrong.');
        onFreeze(null);
      } finally {
        setBusy(false);
      }
    },
    [stripe, elements, busy, email, selection, onFreeze],
  );

  return (
    <form onSubmit={submit} noValidate>
      <div className="field-row">
        <input
          id="email"
          className={`field ${email ? '' : 'is-empty'}`}
          type="email"
          name="email"
          autoComplete="email"
          placeholder="jenny.rosen@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <label className="field-label" htmlFor="email">
          <span>Email (for your receipt)</span>
        </label>
      </div>

      <div className="stripe-block">
        <p className="stripe-block-title">Ship to</p>
        <AddressElement
          options={{
            mode: 'shipping',
            allowedCountries: [...SHIPPING_COUNTRIES],
            fields: { phone: 'auto' },
            display: { name: 'full' },
          }}
          onReady={(element) => {
            addressRef.current = element;
          }}
        />
      </div>

      <div className="stripe-block">
        <p className="stripe-block-title">Payment</p>
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>

      {error ? (
        <div className="alert" data-tone="error" role="alert">
          {error}
        </div>
      ) : null}

      <button className="buy" type="submit" disabled={busy}>
        {busy ? (
          <>
            <span className="spinner" aria-hidden="true" />
            Printing your millisecond…
          </>
        ) : (
          `Buy now — ${formatUsd(PRICE_CENTS)}`
        )}
      </button>

      <p className="fineprint">
        Free shipping. The number printed on your shirt is captured the instant
        you press Buy — it is yours and nobody else&apos;s.
      </p>
    </form>
  );
}

/* ------------------------------------------------------------------- shell */

export default function Checkout({
  style,
  size,
  onStyleChange,
  onSizeChange,
  onFreeze,
}: Props) {
  const stripePromise = useMemo(() => stripeJs(), []);
  const [walletsAvailable, setWalletsAvailable] = useState(false);
  const [expressError, setExpressError] = useState<string | null>(null);
  const selection = useMemo<Selection>(() => ({ style, size }), [style, size]);

  if (!PUBLISHABLE_KEY) {
    return (
      <div className="checkout">
        <Pickers
          style={style}
          size={size}
          onStyleChange={onStyleChange}
          onSizeChange={onSizeChange}
          disabled
        />
        <div className="alert" data-tone="info" style={{ marginTop: 20 }}>
          Checkout is unavailable: <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> is
          not set on this deployment.
        </div>
      </div>
    );
  }

  return (
    <div className="checkout">
      <Pickers
        style={style}
        size={size}
        onStyleChange={onStyleChange}
        onSizeChange={onSizeChange}
        disabled={false}
      />

      <div className="express" style={{ display: walletsAvailable ? 'block' : 'none' }}>
        <Elements stripe={stripePromise} options={ELEMENTS_OPTIONS}>
          <ExpressLane
            selection={selection}
            onFreeze={onFreeze}
            onError={setExpressError}
            onAvailability={setWalletsAvailable}
          />
        </Elements>
      </div>

      {expressError ? (
        <div className="alert" data-tone="error" role="alert">
          {expressError}
        </div>
      ) : null}

      {walletsAvailable ? <div className="divider">or pay by card</div> : null}

      <Elements stripe={stripePromise} options={ELEMENTS_OPTIONS}>
        <CardForm selection={selection} onFreeze={onFreeze} />
      </Elements>
    </div>
  );
}
