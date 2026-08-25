'use client';

import {
  AddressElement,
  Elements,
  ExpressCheckoutElement,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import {
  loadStripe,
  type Appearance,
  type StripeElementsOptions,
  type StripeExpressCheckoutElementConfirmEvent,
} from '@stripe/stripe-js';
import { useCallback, useState, type FormEvent } from 'react';

import {
  ALLOWED_COUNTRIES,
  CURRENCY,
  PRICE_CENTS,
  formatMoney,
  type SizeId,
  type StyleId,
} from '@/lib/product';

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

export type CompletedOrder = {
  paymentIntentId: string;
  clientSecret: string;
  printOrderId: string | null;
  printStage: string | null;
  /** Payment went through but the print order has not been placed yet. */
  fulfillmentPending: boolean;
};

type Props = {
  epochMs: number;
  style: StyleId;
  size: SizeId;
  onComplete: (order: CompletedOrder) => void;
  onStaleTimestamp: () => void;
};

const appearance: Appearance = {
  theme: 'flat',
  variables: {
    colorPrimary: '#2b6cb0',
    colorBackground: '#ffffff',
    colorText: '#101114',
    colorTextSecondary: '#5b6270',
    colorDanger: '#c2264b',
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    fontSizeBase: '16px',
    borderRadius: '0px',
    spacingUnit: '4px',
    spacingGridRow: '14px',
  },
  rules: {
    '.Input': {
      border: 'none',
      borderBottom: '1px solid #a4d5ff',
      boxShadow: 'none',
      padding: '6px 0',
    },
    '.Input:focus': { borderBottomColor: '#2b6cb0', boxShadow: 'none' },
    '.Input--invalid': { borderBottomColor: '#c2264b', color: '#101114' },
    '.Label': {
      fontSize: '13px',
      letterSpacing: '0.04em',
      color: '#949aa6',
      marginBottom: '2px',
    },
    '.Tab': { border: '1px solid #e7e9ee', boxShadow: 'none' },
    '.Tab--selected': { borderColor: '#2b6cb0', color: '#2b6cb0', boxShadow: 'none' },
    '.Error': { fontSize: '13px' },
  },
};

/**
 * Both Elements groups run on automatic payment methods so that whatever the
 * Payment Element offers is exactly what the PaymentIntent will accept —
 * pinning the intent to `card` while the element still advertises Klarna is how
 * you get a customer who picks Klarna and hits a confirmation error.
 */
const elementsOptions: StripeElementsOptions = {
  mode: 'payment',
  amount: PRICE_CENTS,
  currency: CURRENCY,
  captureMethod: 'automatic',
  appearance,
};

class StaleTimestampError extends Error {}

type ShippingDetails = {
  name: string;
  phone?: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postal_code: string;
    country: string;
  };
};

async function createPaymentIntent(input: {
  epochMs: number;
  style: StyleId;
  size: SizeId;
  email?: string;
}): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const response = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (payload?.code === 'stale_timestamp') throw new StaleTimestampError(payload.error);
    throw new Error(payload?.error ?? 'Could not start checkout.');
  }
  return payload;
}

/**
 * Ask the server to place the print order right away. The
 * `payment_intent.succeeded` webhook does the same thing, so if this call fails
 * the shirt still gets printed — we just cannot show the number yet.
 */
async function placePrintOrder(
  paymentIntentId: string,
  clientSecret: string,
): Promise<CompletedOrder> {
  try {
    const response = await fetch('/api/orders/finalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentIntentId, clientSecret }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error ?? 'Fulfillment deferred.');
    return {
      paymentIntentId,
      clientSecret,
      printOrderId: payload.orderId ?? null,
      printStage: payload.stage ?? null,
      fulfillmentPending: !payload.orderId,
    };
  } catch (error) {
    console.warn('[checkout] deferring fulfillment to the webhook:', error);
    return {
      paymentIntentId,
      clientSecret,
      printOrderId: null,
      printStage: null,
      fulfillmentPending: true,
    };
  }
}

function returnUrl(paymentIntentId: string): string {
  return `${window.location.origin}/order/${paymentIntentId}`;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

export function Checkout(props: Props) {
  const [expressAvailable, setExpressAvailable] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!stripePromise) {
    return (
      <div className="alert">
        Payments are not configured on this deployment. Set{' '}
        <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> and redeploy.
      </div>
    );
  }

  const shared = { ...props, busy, setBusy, setError };

  return (
    <div className="panel">
      {error ? (
        <div className="alert" role="alert">
          {error}
        </div>
      ) : null}

      <div
        className="express-slot"
        style={{ display: expressAvailable === false ? 'none' : 'block' }}
      >
        <Elements stripe={stripePromise} options={elementsOptions}>
          <ExpressPanel {...shared} onAvailability={setExpressAvailable} />
        </Elements>
      </div>

      {expressAvailable ? <div className="divider">or pay by card</div> : null}

      <Elements stripe={stripePromise} options={elementsOptions}>
        <CardPanel {...shared} />
      </Elements>
    </div>
  );
}

type PanelProps = Props & {
  busy: boolean;
  setBusy: (value: boolean) => void;
  setError: (value: string | null) => void;
};

function ExpressPanel({
  epochMs,
  style,
  size,
  onComplete,
  onStaleTimestamp,
  setBusy,
  setError,
  onAvailability,
}: PanelProps & { onAvailability: (value: boolean) => void }) {
  const stripe = useStripe();
  const elements = useElements();

  const handleConfirm = useCallback(
    async (event: StripeExpressCheckoutElementConfirmEvent) => {
      if (!stripe || !elements) return;
      setError(null);
      setBusy(true);
      try {
        const { error: submitError } = await elements.submit();
        if (submitError) throw new Error(submitError.message ?? 'Could not start payment.');

        const email = event.billingDetails?.email ?? undefined;
        const { clientSecret, paymentIntentId } = await createPaymentIntent({
          epochMs,
          style,
          size,
          email,
        });

        const shipping = event.shippingAddress
          ? ({
              name: event.shippingAddress.name,
              address: {
                line1: event.shippingAddress.address.line1 ?? '',
                line2: event.shippingAddress.address.line2 ?? undefined,
                city: event.shippingAddress.address.city ?? '',
                state: event.shippingAddress.address.state ?? undefined,
                postal_code: event.shippingAddress.address.postal_code ?? '',
                country: event.shippingAddress.address.country ?? '',
              },
            } satisfies ShippingDetails)
          : undefined;

        const { error, paymentIntent } = await stripe.confirmPayment({
          elements,
          clientSecret,
          confirmParams: {
            return_url: returnUrl(paymentIntentId),
            receipt_email: email,
            shipping,
          },
          redirect: 'if_required',
        });

        if (error) {
          event.paymentFailed({ reason: 'fail' });
          throw new Error(error.message ?? 'That payment did not go through.');
        }
        if (paymentIntent) {
          onComplete(await placePrintOrder(paymentIntent.id, clientSecret));
        }
      } catch (error) {
        if (error instanceof StaleTimestampError) {
          onStaleTimestamp();
          setError(error.message);
        } else {
          setError(messageOf(error));
        }
      } finally {
        setBusy(false);
      }
    },
    [stripe, elements, epochMs, style, size, onComplete, onStaleTimestamp, setBusy, setError],
  );

  return (
    <ExpressCheckoutElement
      options={{
        buttonHeight: 50,
        layout: { maxColumns: 1, maxRows: 2, overflow: 'auto' },
      }}
      onReady={({ availablePaymentMethods }) =>
        // `availablePaymentMethods` is an object of flags — an empty wallet set
        // still arrives as a truthy object, so check the flags themselves.
        onAvailability(Object.values(availablePaymentMethods ?? {}).some(Boolean))
      }
      onClick={({ resolve }) =>
        resolve({
          emailRequired: true,
          shippingAddressRequired: true,
          allowedShippingCountries: [...ALLOWED_COUNTRIES],
          business: { name: 'datetime.store' },
          lineItems: [{ name: `datetime tee — ${style}, ${size}`, amount: PRICE_CENTS }],
          shippingRates: [
            {
              id: 'free',
              displayName: '📦 Free shipping',
              amount: 0,
              deliveryEstimate: {
                minimum: { unit: 'business_day', value: 5 },
                maximum: { unit: 'business_day', value: 10 },
              },
            },
          ],
        })
      }
      onShippingAddressChange={({ resolve }) => resolve({})}
      onShippingRateChange={({ resolve }) => resolve({})}
      onCancel={() => setBusy(false)}
      onConfirm={handleConfirm}
    />
  );
}

function CardPanel({
  epochMs,
  style,
  size,
  onComplete,
  onStaleTimestamp,
  busy,
  setBusy,
  setError,
}: PanelProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [email, setEmail] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!stripe || !elements || busy) return;

    setError(null);
    setBusy(true);
    try {
      if (!email) throw new Error('We need an email address to send your receipt to.');

      const { error: submitError } = await elements.submit();
      if (submitError) throw new Error(submitError.message ?? 'Please check the form.');

      const addressElement = elements.getElement('address');
      const addressValue = await addressElement?.getValue();
      if (!addressValue?.complete) throw new Error('Please finish your shipping address.');

      const shipping: ShippingDetails = {
        name: addressValue.value.name,
        phone: addressValue.value.phone,
        address: {
          line1: addressValue.value.address.line1,
          line2: addressValue.value.address.line2 ?? undefined,
          city: addressValue.value.address.city,
          state: addressValue.value.address.state ?? undefined,
          postal_code: addressValue.value.address.postal_code,
          country: addressValue.value.address.country,
        },
      };

      const { clientSecret, paymentIntentId } = await createPaymentIntent({
        epochMs,
        style,
        size,
        email,
      });

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: returnUrl(paymentIntentId),
          receipt_email: email,
          shipping,
        },
        redirect: 'if_required',
      });

      if (error) throw new Error(error.message ?? 'That payment did not go through.');
      if (paymentIntent) {
        onComplete(await placePrintOrder(paymentIntent.id, clientSecret));
      }
    } catch (error) {
      if (error instanceof StaleTimestampError) {
        onStaleTimestamp();
        setError(error.message);
      } else {
        setError(messageOf(error));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label className="field-row">
        <span>Email (for your receipt)</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          placeholder="ada@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <div style={{ marginBottom: 14 }}>
        <AddressElement
          options={{
            mode: 'shipping',
            allowedCountries: [...ALLOWED_COUNTRIES],
            // Carriers like having a phone number, but nobody should be blocked
            // on it: show the field, never require it.
            fields: { phone: 'always' },
            validation: { phone: { required: 'never' } },
            display: { name: 'full' },
            // Show every address field up front. The Google-Maps-backed
            // autocomplete hides city/state/postcode behind a search box, which
            // is one more place a customer can get stuck on the only page that
            // matters.
            autocomplete: { mode: 'disabled' },
          }}
        />
      </div>
      <div style={{ marginBottom: 18 }}>
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>
      <button className="btn" type="submit" disabled={busy || !stripe}>
        {busy ? (
          <>
            <span className="spinner" aria-hidden="true" /> Processing…
          </>
        ) : (
          <>Pay {formatMoney(PRICE_CENTS)}</>
        )}
      </button>
    </form>
  );
}
