'use client';

import {
  AddressElement,
  CardElement,
  ExpressCheckoutElement,
  Elements,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { loadStripe, type Stripe, type StripeElementsOptions } from '@stripe/stripe-js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  PRICE_CENTS,
  SHIP_TO_COUNTRIES,
  formatUsd,
  type ShirtSize,
  type ShirtStyle,
} from '@/lib/product';

export type OrderSnapshot = {
  orderRef: string;
  prodigiOrderId: string | null;
  prodigiStage: string | null;
  capturedAt: number | null;
  style: string | null;
  size: string | null;
  amount: number;
  currency: string;
};

type Props = {
  publishableKey: string;
  testMode: boolean;
  style: ShirtStyle;
  size: ShirtSize;
  frozenAt: number | null;
  order: OrderSnapshot | null;
  onFreeze: () => number;
  onRelease: () => void;
  onBusyChange: (busy: boolean) => void;
  onComplete: (order: OrderSnapshot) => void;
  onStartOver: () => void;
};

type Shipping = {
  name: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  country: string;
};

type DraftOrder = { clientSecret: string; orderRef: string };

class CheckoutError extends Error {
  issues: string[];
  constructor(message: string, issues: string[] = []) {
    super(message);
    this.issues = issues;
  }
}

let stripePromise: Promise<Stripe | null> | null = null;
function getStripe(publishableKey: string) {
  if (!stripePromise) stripePromise = loadStripe(publishableKey);
  return stripePromise;
}

const APPEARANCE: StripeElementsOptions['appearance'] = {
  theme: 'stripe',
  labels: 'floating',
  variables: {
    colorPrimary: '#337ab7',
    colorText: '#111214',
    colorDanger: '#d0322b',
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    fontSizeBase: '16px',
    borderRadius: '4px',
    spacingUnit: '4px',
  },
  rules: {
    '.Input': { boxShadow: 'none', borderColor: '#dfe2e6' },
    '.Input:focus': { boxShadow: '0 0 0 1px #337ab7', borderColor: '#337ab7' },
    '.Tab': { boxShadow: 'none' },
  },
};

export default function Checkout(props: Props) {
  const { publishableKey, order, onStartOver } = props;
  const [draft, setDraft] = useState<DraftOrder | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const requested = useRef(false);

  /**
   * Open a PaymentIntent up front so Elements can be built from the intent
   * itself. That is what keeps the payment methods on screen in step with the
   * card-only intent the server created.
   */
  useEffect(() => {
    if (!publishableKey || requested.current) return;
    requested.current = true;
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch('/api/checkout', { method: 'POST' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? 'Checkout is unavailable.');
        if (!cancelled) setDraft({ clientSecret: data.clientSecret, orderRef: data.orderRef });
      } catch (error) {
        if (!cancelled) setDraftError((error as Error).message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [publishableKey]);

  const options = useMemo<StripeElementsOptions | null>(
    () => (draft ? { clientSecret: draft.clientSecret, appearance: APPEARANCE } : null),
    [draft],
  );

  if (order) return <Success order={order} onStartOver={onStartOver} />;

  if (!publishableKey) {
    return (
      <div className="alert">
        Checkout is not configured: <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> is missing.
      </div>
    );
  }

  if (draftError) {
    return <div className="alert">{draftError}</div>;
  }

  if (!draft || !options) {
    return <div className="skeleton" aria-label="Loading checkout" />;
  }

  return (
    <Elements stripe={getStripe(publishableKey)} options={options}>
      <CheckoutForm {...props} draft={draft} />
    </Elements>
  );
}

function CheckoutForm({
  testMode,
  style,
  size,
  frozenAt,
  draft,
  onFreeze,
  onRelease,
  onBusyChange,
  onComplete,
}: Props & { draft: DraftOrder }) {
  const stripe = useStripe();
  const elements = useElements();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [expressAvailable, setExpressAvailable] = useState(false);
  const [card, setCard] = useState({ empty: true, focused: false, invalid: false });
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<string[]>([]);

  const setWorking = useCallback(
    (value: boolean) => {
      setBusy(value);
      onBusyChange(value);
    },
    [onBusyChange],
  );

  /** Attaches this shirt to the intent and pre-flights it with Prodigi. */
  const prepare = useCallback(
    async (capturedAt: number, shipping: Shipping, buyerEmail: string) => {
      const response = await fetch(`/api/orders/${draft.orderRef}/prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientSecret: draft.clientSecret,
          capturedAt,
          style,
          size,
          email: buyerEmail,
          shipping,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new CheckoutError(data.error ?? 'Checkout failed.', data.issues ?? []);
      }
    },
    [draft, style, size],
  );

  /**
   * Hands the authorised intent to the printer. The Stripe webhook does this
   * too; calling it here just means the shopper sees a real order number
   * without waiting on webhook delivery.
   */
  const settle = useCallback(async () => {
    const response = await fetch(`/api/orders/${draft.orderRef}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientSecret: draft.clientSecret }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new CheckoutError(data.error ?? 'We could not confirm that order.');
    }
    if (data.result?.state === 'failed') {
      throw new CheckoutError(
        data.result.refunded
          ? 'The printer rejected this order, so your payment was released. Nothing was charged.'
          : 'The printer rejected this order. Please contact us before trying again.',
      );
    }
    return data as OrderSnapshot;
  }, [draft]);

  const readShipping = useCallback(async (): Promise<Shipping> => {
    const addressElement = elements?.getElement('address');
    if (!addressElement) throw new CheckoutError('The address form is still loading.');
    const result = await addressElement.getValue();
    if (!result.complete) throw new CheckoutError('Please finish the shipping address.');
    const { name, address } = result.value;
    return {
      name,
      line1: address.line1,
      line2: address.line2 || null,
      city: address.city,
      state: address.state || null,
      postalCode: address.postal_code,
      country: address.country,
    };
  }, [elements]);

  const reportError = useCallback((cause: unknown) => {
    if (cause instanceof CheckoutError) {
      setError(cause.message);
      setIssues(cause.issues);
    } else {
      setError(cause instanceof Error ? cause.message : 'Something went wrong.');
      setIssues([]);
    }
  }, []);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!stripe || !elements || busy) return;

      setError(null);
      setIssues([]);
      const capturedAt = onFreeze();
      setWorking(true);

      try {
        const shipping = await readShipping();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          throw new CheckoutError('Please add a valid email for your receipt.');
        }

        const cardElement = elements.getElement(CardElement);
        if (!cardElement) throw new CheckoutError('The card field is still loading.');

        await prepare(capturedAt, shipping, email);

        const { error: confirmError } = await stripe.confirmCardPayment(draft.clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: shipping.name,
              email,
              address: {
                line1: shipping.line1,
                line2: shipping.line2 ?? undefined,
                city: shipping.city,
                state: shipping.state ?? undefined,
                postal_code: shipping.postalCode,
                country: shipping.country,
              },
            },
          },
        });
        if (confirmError) throw new CheckoutError(confirmError.message ?? 'Your payment was declined.');

        onComplete(await settle());
      } catch (cause) {
        reportError(cause);
      } finally {
        setWorking(false);
      }
    },
    [
      stripe,
      elements,
      busy,
      email,
      draft,
      onFreeze,
      setWorking,
      readShipping,
      prepare,
      settle,
      onComplete,
      reportError,
    ],
  );

  /** Apple Pay / Google Pay — the wallet path the original store led with. */
  const handleExpressConfirm = useCallback(
    async (event: {
      billingDetails?: { email?: string | null; name?: string | null };
      shippingAddress?: {
        name?: string | null;
        address: {
          line1: string;
          line2?: string | null;
          city: string;
          state: string;
          postal_code: string;
          country: string;
        };
      };
      paymentFailed: (options?: { reason?: 'fail' | 'invalid_shipping_address' }) => void;
    }) => {
      if (!stripe || !elements) return;
      setError(null);
      setIssues([]);
      const capturedAt = onFreeze();
      setWorking(true);

      try {
        const wallet = event.shippingAddress;
        const buyerEmail = event.billingDetails?.email ?? email;
        if (!wallet?.address?.line1 || !buyerEmail) {
          event.paymentFailed({ reason: 'invalid_shipping_address' });
          throw new CheckoutError('Your wallet did not share a complete shipping address.');
        }

        const shipping: Shipping = {
          name: wallet.name || event.billingDetails?.name || 'Customer',
          line1: wallet.address.line1,
          line2: wallet.address.line2 || null,
          city: wallet.address.city,
          state: wallet.address.state || null,
          postalCode: wallet.address.postal_code,
          country: wallet.address.country,
        };

        await prepare(capturedAt, shipping, buyerEmail);

        const { error: confirmError } = await stripe.confirmPayment({
          elements,
          redirect: 'if_required',
        });
        if (confirmError) {
          event.paymentFailed({ reason: 'fail' });
          throw new CheckoutError(confirmError.message ?? 'Your payment was declined.');
        }

        onComplete(await settle());
      } catch (cause) {
        reportError(cause);
      } finally {
        setWorking(false);
      }
    },
    [stripe, elements, email, onFreeze, setWorking, prepare, settle, onComplete, reportError],
  );

  return (
    <form className="checkout-form" onSubmit={handleSubmit} noValidate>
      {error ? (
        <div className="alert" role="alert">
          {error}
          {issues.length > 0 ? (
            <ul>
              {issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          ) : null}
          {frozenAt !== null && !busy ? (
            <button type="button" onClick={onRelease}>
              Release {frozenAt} and grab a fresh timestamp
            </button>
          ) : null}
        </div>
      ) : null}

      {testMode ? (
        <div className="notice">
          Test mode. Pay with card <strong>4242 4242 4242 4242</strong>, any future expiry, any CVC.
        </div>
      ) : null}

      <div className="express">
        <ExpressCheckoutElement
          options={{
            emailRequired: true,
            shippingAddressRequired: true,
            phoneNumberRequired: false,
            allowedShippingCountries: [...SHIP_TO_COUNTRIES],
            shippingRates: [{ id: 'free', displayName: 'Free shipping', amount: 0 }],
            paymentMethods: {
              applePay: 'auto',
              googlePay: 'auto',
              link: 'never',
              amazonPay: 'never',
              paypal: 'never',
              klarna: 'never',
            },
            buttonHeight: 48,
          }}
          onReady={({ availablePaymentMethods }) =>
            setExpressAvailable(Boolean(availablePaymentMethods))
          }
          onClick={({ resolve }) => {
            onFreeze();
            resolve();
          }}
          onShippingAddressChange={({ resolve }) => resolve()}
          onShippingRateChange={({ resolve }) => resolve()}
          onConfirm={handleExpressConfirm}
          onLoadError={() => setExpressAvailable(false)}
        />
      </div>
      {expressAvailable ? <div className="divider">or pay by card</div> : null}

      <div className="stripe-field email-field">
        <input
          id="buyer-email"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          placeholder=" "
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <label htmlFor="buyer-email">Email (for your receipt)</label>
      </div>

      <div className="stripe-field">
        <AddressElement
          options={{
            mode: 'shipping',
            allowedCountries: [...SHIP_TO_COUNTRIES],
            fields: { phone: 'never' },
            display: { name: 'full' },
          }}
        />
      </div>

      <div
        className={[
          'stripe-field',
          'card-field',
          card.focused ? 'is-focused' : '',
          card.invalid ? 'is-invalid' : '',
          card.focused || !card.empty ? 'is-active' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <CardElement
          options={{
            hidePostalCode: true,
            style: {
              base: {
                fontSize: '16px',
                color: '#111214',
                fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
                fontSmoothing: 'antialiased',
                '::placeholder': { color: '#b6bac1' },
              },
              invalid: { color: '#d0322b', iconColor: '#d0322b' },
            },
          }}
          onReady={() => setReady(true)}
          onFocus={() => setCard((state) => ({ ...state, focused: true }))}
          onBlur={() => setCard((state) => ({ ...state, focused: false }))}
          onChange={(event) => {
            setCard((state) => ({ ...state, empty: event.empty, invalid: Boolean(event.error) }));
            if (event.error) setError(event.error.message);
          }}
        />
        <span className="card-field-label" aria-hidden="true">
          Card details
        </span>
      </div>

      <button className="buy" type="submit" disabled={!stripe || busy || !ready}>
        {busy ? 'Printing your millisecond…' : `Buy now — ${formatUsd(PRICE_CENTS)}`}
      </button>

      <p className="fineprint">
        Free shipping in the US. Your card is authorised now and only charged once the printer
        accepts the job. One shirt per order, stamped with the millisecond you pressed buy.
      </p>
    </form>
  );
}

function Success({ order, onStartOver }: { order: OrderSnapshot; onStartOver: () => void }) {
  const stamped = order.capturedAt;
  return (
    <div className="success">
      <h2>Congrats on your pretty cool shirt!</h2>
      <p>
        Your shirt is off to the printer stamped <strong>{stamped}</strong>
        {stamped ? ` (${new Date(stamped).toUTCString()})` : ''}. A receipt is on its way to your
        inbox.
      </p>
      <dl className="summary">
        <div className="summary-row">
          <dt>Order</dt>
          <dd>{order.orderRef}</dd>
        </div>
        {order.prodigiOrderId ? (
          <div className="summary-row">
            <dt>Printer reference</dt>
            <dd>{order.prodigiOrderId}</dd>
          </div>
        ) : null}
        {order.prodigiStage ? (
          <div className="summary-row">
            <dt>Status</dt>
            <dd>{order.prodigiStage}</dd>
          </div>
        ) : null}
        <div className="summary-row">
          <dt>Shirt</dt>
          <dd>
            {order.style} · {order.size}
          </dd>
        </div>
        <div className="summary-row">
          <dt>Paid</dt>
          <dd>{formatUsd(order.amount)}</dd>
        </div>
        {stamped ? (
          <div className="summary-row">
            <dt>Print file</dt>
            <dd>
              <a href={`/api/artwork/${stamped}.png?dpi=72&bg=17181a`} target="_blank" rel="noreferrer">
                view
              </a>
            </dd>
          </div>
        ) : null}
      </dl>
      <button className="buy again" type="button" onClick={onStartOver}>
        Get another shirt
      </button>
    </div>
  );
}
