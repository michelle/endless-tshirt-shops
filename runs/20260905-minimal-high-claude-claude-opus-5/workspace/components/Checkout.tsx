'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AddressElement,
  ExpressCheckoutElement,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import type {
  StripeExpressCheckoutElementConfirmEvent,
  StripeExpressCheckoutElementReadyEvent,
} from '@stripe/stripe-js';
import type { Session } from './Store';
import { formatUsd, type ShirtSize, type ShirtStyle } from '@/lib/products';
import type { ShippingAddress } from '@/lib/order';

export type ReturnedSession = Session;

type OrderResult = {
  paymentStatus: string;
  fulfillmentStatus: 'awaiting_payment' | 'placing' | 'placed' | 'failed';
  orderId: string | null;
  error: string | null;
  receiptEmail: string | null;
  shirt: {
    ts: number;
    style: string;
    size: string;
    blank: string;
    artworkUrl: string;
  } | null;
};

type Props = {
  session: Session;
  returned: ReturnedSession | null;
  style: ShirtStyle;
  size: ShirtSize;
  priceCents: number;
  freezeNow: () => number;
  unfreeze: () => void;
  onReset: () => void;
};

const EMAIL_RE = /^[^@\s]+@[^@\s.]+\.[^@\s]+$/;
const POLL_INTERVAL_MS = 1500;
const POLL_ATTEMPTS = 16;

export default function Checkout({
  session,
  returned,
  style,
  size,
  priceCents,
  freezeNow,
  unfreeze,
  onReset,
}: Props) {
  const stripe = useStripe();
  const elements = useElements();

  const [hasWallets, setHasWallets] = useState(false);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderResult | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /**
   * Kicks fulfilment off exactly once, then watches read-only status until it
   * settles. Fulfilment is deliberately not part of the polling loop: every
   * extra caller is another racer for the same print order.
   */
  const settle = useCallback(async () => {
    const res = await fetch('/api/orders/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentIntentId: session.paymentIntentId,
        clientSecret: session.clientSecret,
      }),
    });
    const first = (await res.json()) as OrderResult & { error?: string };
    if (!res.ok) throw new Error(first?.error || 'Could not confirm your order');
    if (!mounted.current) return first;
    setOrder(first);
    if (first.fulfillmentStatus === 'placed' || first.fulfillmentStatus === 'failed') {
      return first;
    }
    if (first.paymentStatus === 'requires_payment_method') {
      throw new Error('That payment did not go through. Try another card.');
    }
    // ACH and other delayed methods settle hours or days later. There is
    // nothing to poll for; the webhook will fulfil when it clears.
    if (first.paymentStatus === 'processing') return first;

    const query = new URLSearchParams({
      payment_intent: session.paymentIntentId,
      client_secret: session.clientSecret,
    });
    for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      const poll = await fetch(`/api/orders/status?${query}`);
      const json = (await poll.json()) as OrderResult & { error?: string };
      if (!poll.ok) throw new Error(json?.error || 'Could not check your order');
      if (!mounted.current) return json;
      setOrder(json);
      if (
        json.fulfillmentStatus === 'placed' ||
        json.fulfillmentStatus === 'failed' ||
        json.paymentStatus === 'processing'
      ) {
        return json;
      }
    }
    return null;
  }, [session]);

  // Coming back from a redirect payment method: skip straight to the receipt.
  useEffect(() => {
    if (!returned) return;
    setBusy(true);
    settle()
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Could not confirm your order'),
      )
      .finally(() => mounted.current && setBusy(false));
  }, [returned, settle]);

  const prepare = useCallback(
    async (ts: number, buyerEmail: string, address: ShippingAddress) => {
      const res = await fetch('/api/checkout/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentIntentId: session.paymentIntentId,
          clientSecret: session.clientSecret,
          ts,
          style,
          size,
          email: buyerEmail,
          address,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'We could not prepare that order');
      return json;
    },
    [session, style, size],
  );

  const returnUrl =
    typeof window === 'undefined' ? '' : `${window.location.origin}/`;

  const handleManualSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!stripe || !elements || busy) return;

      setError(null);
      setBusy(true);

      // The moment of purchase is the product. Freeze it here.
      const ts = freezeNow();

      try {
        if (!EMAIL_RE.test(email.trim())) {
          throw new Error('Enter an email address so we can send your receipt.');
        }

        const addressElement = elements.getElement('address');
        if (!addressElement) throw new Error('Checkout is still loading.');
        const { complete, value } = await addressElement.getValue();
        if (!complete) throw new Error('Fill in your full shipping address.');

        await prepare(ts, email.trim(), {
          name: value.name,
          line1: value.address.line1,
          line2: value.address.line2 ?? undefined,
          city: value.address.city,
          state: value.address.state ?? undefined,
          postalCode: value.address.postal_code,
          country: value.address.country,
        });

        const { error: stripeError } = await stripe.confirmPayment({
          elements,
          confirmParams: { return_url: returnUrl },
          redirect: 'if_required',
        });
        if (stripeError) throw new Error(stripeError.message || 'Payment failed.');

        await settle();
      } catch (err) {
        unfreeze();
        setError(err instanceof Error ? err.message : 'Something went wrong.');
      } finally {
        if (mounted.current) setBusy(false);
      }
    },
    [stripe, elements, busy, email, freezeNow, unfreeze, prepare, settle, returnUrl],
  );

  const handleExpressConfirm = useCallback(
    async (event: StripeExpressCheckoutElementConfirmEvent) => {
      if (!stripe || !elements) return;
      setError(null);
      setBusy(true);
      const ts = freezeNow();

      try {
        const shipping = event.shippingAddress;
        const buyerEmail = event.billingDetails?.email ?? '';
        if (!shipping || !EMAIL_RE.test(buyerEmail)) {
          event.paymentFailed({ reason: 'invalid_shipping_address' });
          throw new Error('Your wallet did not share a usable address or email.');
        }

        await prepare(ts, buyerEmail, {
          name: shipping.name,
          line1: shipping.address.line1,
          line2: shipping.address.line2 ?? undefined,
          city: shipping.address.city ?? '',
          state: shipping.address.state ?? undefined,
          postalCode: shipping.address.postal_code ?? '',
          country: shipping.address.country ?? '',
        }).catch((err) => {
          event.paymentFailed({ reason: 'invalid_shipping_address' });
          throw err;
        });

        const { error: stripeError } = await stripe.confirmPayment({
          elements,
          confirmParams: { return_url: returnUrl },
          redirect: 'if_required',
        });
        if (stripeError) throw new Error(stripeError.message || 'Payment failed.');

        await settle();
      } catch (err) {
        unfreeze();
        setError(err instanceof Error ? err.message : 'Something went wrong.');
      } finally {
        if (mounted.current) setBusy(false);
      }
    },
    [stripe, elements, freezeNow, unfreeze, prepare, settle, returnUrl],
  );

  const handleReady = useCallback((event: StripeExpressCheckoutElementReadyEvent) => {
    const available = event.availablePaymentMethods;
    setHasWallets(Boolean(available && Object.keys(available).length > 0));
  }, []);

  if (
    order &&
    (order.fulfillmentStatus === 'placed' ||
      order.paymentStatus === 'succeeded' ||
      order.paymentStatus === 'processing')
  ) {
    return <Receipt order={order} onReset={onReset} />;
  }

  return (
    <div>
      <div className="Checkout-express" aria-busy={busy}>
        <ExpressCheckoutElement
          options={{
            buttonHeight: 47,
            buttonType: { applePay: 'buy', googlePay: 'buy' },
            layout: { maxColumns: 1, maxRows: 2 },
            // Only wallets that hand back a real shipping address; this is a
            // physical product. The rest are excluded on the PaymentIntent.
            paymentMethods: { amazonPay: 'never', paypal: 'never' },
          }}
          onReady={handleReady}
          onClick={({ resolve }) =>
            resolve({
              emailRequired: true,
              phoneNumberRequired: false,
              shippingAddressRequired: true,
              lineItems: [{ name: 'datetime tee', amount: priceCents }],
              shippingRates: [
                {
                  id: 'free',
                  displayName: '\u{1F4E6} Free shipping!',
                  amount: 0,
                },
              ],
            })
          }
          onShippingAddressChange={({ resolve }) => resolve({})}
          onShippingRateChange={({ resolve }) => resolve({})}
          onConfirm={handleExpressConfirm}
        />
      </div>

      <form onSubmit={handleManualSubmit} noValidate>
          <div className="Checkout-divider">
            {hasWallets ? 'or pay by card' : 'ship it to'}
          </div>
          <AddressElement
            options={{
              mode: 'shipping',
              display: { name: 'full' },
              fields: { phone: 'never' },
              autocomplete: { mode: 'automatic' },
            }}
          />

          <label className="field-label">
            <input
              className={`field ${email ? '' : 'is-empty'}`}
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              placeholder="michelle@stripe.com"
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <span>
              <span>Email (for receipt)</span>
            </span>
          </label>

          <div className="Checkout-divider">pay</div>
          <PaymentElement options={{ layout: 'tabs' }} />

          <button className="primary" type="submit" disabled={busy || !stripe}>
            {busy ? (
              <>
                <span className="spinner" aria-hidden="true" />
                Processing…
              </>
            ) : (
              `Buy now · ${formatUsd(priceCents)}`
            )}
          </button>
          <p className="note">
            Free shipping. Your shirt is printed with the exact millisecond you
            press Buy.
          </p>
      </form>

      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

function Receipt({ order, onReset }: { order: OrderResult; onReset: () => void }) {
  const placed = order.fulfillmentStatus === 'placed';
  const failed = order.fulfillmentStatus === 'failed';
  // Bank debits and some wallets clear asynchronously. We hold the print job
  // until the money is real, rather than promising an order number we do not
  // have yet.
  const clearing = order.paymentStatus === 'processing';

  return (
    <div className="Checkout-success">
      <p className="Checkout-success-title">Congrats on your pretty cool shirt!</p>
      <p>
        {clearing ? (
          <>
            Your payment is still clearing with your bank. We will print your
            shirt and email you the moment it settles
            {order.receiptEmail ? (
              <>
                {' '}
                at <strong>{order.receiptEmail}</strong>
              </>
            ) : null}
            .
          </>
        ) : order.receiptEmail ? (
          <>
            We emailed a receipt to <strong>{order.receiptEmail}</strong>.
          </>
        ) : (
          'Your payment went through.'
        )}
      </p>

      {order.shirt && (
        <dl>
          <dt>Moment</dt>
          <dd>
            <code>{order.shirt.ts}</code>
          </dd>
          <dt>Shirt</dt>
          <dd>
            {order.shirt.style} · {order.shirt.size}
          </dd>
          <dt>Print order</dt>
          <dd>
            {placed ? (
              <code>{order.orderId}</code>
            ) : failed ? (
              <span className="pending">needs attention</span>
            ) : clearing ? (
              <span className="pending">queued until payment clears</span>
            ) : (
              <span className="pending">being placed…</span>
            )}
          </dd>
        </dl>
      )}

      {failed && (
        <div className="alert" role="alert">
          We took your payment but could not hand the print job to our printer
          yet{order.error ? `: ${order.error}` : '.'} We are retrying — you do not
          need to do anything.
        </div>
      )}
      {!placed && !failed && !clearing && (
        <p className="pending">Handing your shirt to the printer…</p>
      )}

      <button className="primary" type="button" onClick={onReset}>
        Get another shirt
      </button>
    </div>
  );
}
