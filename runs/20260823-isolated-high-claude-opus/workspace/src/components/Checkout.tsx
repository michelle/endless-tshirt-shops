'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ExpressCheckoutElement,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import type { StripeExpressCheckoutElementConfirmEvent } from '@stripe/stripe-js';
import {
  PRICE_CENTS,
  SHIRT_SIZES,
  STYLE_SPECS,
  SHIRT_STYLES,
  formatUsd,
  type ShirtSize,
  type ShirtStyle,
} from '@/lib/catalog';
import { renderPrintArtwork } from '@/lib/artwork';
import {
  AddressForm,
  EMPTY_ADDRESS,
  validateAddress,
  type AddressFields,
} from './AddressForm';

type Props = {
  style: ShirtStyle;
  size: ShirtSize;
  onStyleChange: (style: ShirtStyle) => void;
  onSizeChange: (size: ShirtSize) => void;
  frozenAt: number | null;
  /** Locks the timestamp and returns the locked value. */
  onFreeze: () => number;
  onUnfreeze: () => void;
  font: string;
};

type ApiError = { message: string; issues: string[] };

const SHIPPING_RATES = [
  { id: 'free', displayName: 'Free shipping', amount: 0, deliveryEstimate: { maximum: { unit: 'business_day' as const, value: 10 } } },
];

export function Checkout(props: Props) {
  const { style, size, onStyleChange, onSizeChange, frozenAt, onFreeze, onUnfreeze, font } = props;
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

  const [showForm, setShowForm] = useState(false);
  const [walletReady, setWalletReady] = useState(false);
  const [address, setAddress] = useState<AddressFields>(EMPTY_ADDRESS);
  const [invalid, setInvalid] = useState<ReadonlySet<keyof AddressFields>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const controlsLocked = busy;

  /**
   * Creates the PaymentIntent. The server re-derives the price and validates the
   * address with Scalable Press first, so a failure here means we have not
   * charged anybody.
   */
  const createIntent = useCallback(
    async (timestamp: number, email: string, addr: Omit<AddressFields, 'email'>) => {
      const artwork = renderPrintArtwork(timestamp, font);
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          style,
          size,
          timestamp,
          artwork,
          address: {
            name: addr.name,
            address1: addr.address1,
            address2: addr.address2,
            city: addr.city,
            state: addr.state,
            zip: addr.zip,
            country: 'US',
          },
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw {
          message: body.error ?? 'We could not set up your order.',
          issues: (body.issues ?? [])
            .map((i: { message?: string }) => i.message)
            .filter(Boolean) as string[],
        } satisfies ApiError;
      }
      return body as { clientSecret: string; paymentIntentId: string };
    },
    [font, size, style],
  );

  const goToThanks = useCallback(
    (paymentIntentId: string, clientSecret: string) => {
      const params = new URLSearchParams({
        payment_intent: paymentIntentId,
        payment_intent_client_secret: clientSecret,
      });
      router.push(`/thanks?${params.toString()}`);
    },
    [router],
  );

  const returnUrl = useMemo(
    () => (typeof window === 'undefined' ? '' : `${window.location.origin}/thanks`),
    [],
  );

  /** Wallet (Apple Pay / Google Pay / Link) path. */
  const handleWalletConfirm = useCallback(
    async (event: StripeExpressCheckoutElementConfirmEvent) => {
      if (!stripe || !elements) return;
      setBusy(true);
      setError(null);

      try {
        const submit = await elements.submit();
        if (submit.error) throw { message: submit.error.message ?? 'Payment details incomplete.', issues: [] };

        const shipping = event.shippingAddress;
        const email = event.billingDetails?.email ?? '';
        if (!shipping?.address || !email) {
          throw { message: 'Your wallet did not share a shipping address and email.', issues: [] };
        }
        const a = shipping.address;
        if ((a.country ?? 'US') !== 'US') {
          throw { message: 'We can only ship within the US right now.', issues: [] };
        }

        const timestamp = frozenAt ?? onFreeze();
        const { clientSecret, paymentIntentId } = await createIntent(timestamp, email, {
          name: shipping.name ?? event.billingDetails?.name ?? '',
          address1: a.line1 ?? '',
          address2: a.line2 ?? '',
          city: a.city ?? '',
          state: a.state ?? '',
          zip: a.postal_code ?? '',
        });

        const result = await stripe.confirmPayment({
          elements,
          clientSecret,
          confirmParams: { return_url: returnUrl },
          redirect: 'if_required',
        });
        if (result.error) throw { message: result.error.message ?? 'Payment failed.', issues: [] };

        goToThanks(paymentIntentId, clientSecret);
      } catch (err) {
        // Dismiss the wallet sheet with a failure so the customer isn't stranded.
        event.paymentFailed({ reason: 'fail' });
        setError(asApiError(err));
        setBusy(false);
      }
    },
    [createIntent, elements, frozenAt, goToThanks, onFreeze, returnUrl, stripe],
  );

  /** Manual card / address path. */
  const handleFormSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!stripe || !elements || busy) return;

      const bad = validateAddress(address);
      setInvalid(bad);
      if (bad.size > 0) {
        setError({ message: 'Please fix the highlighted fields.', issues: [] });
        return;
      }

      setBusy(true);
      setError(null);

      try {
        const submit = await elements.submit();
        if (submit.error) throw { message: submit.error.message ?? 'Payment details incomplete.', issues: [] };

        const timestamp = frozenAt ?? onFreeze();
        const { clientSecret, paymentIntentId } = await createIntent(
          timestamp,
          address.email.trim(),
          address,
        );

        const result = await stripe.confirmPayment({
          elements,
          clientSecret,
          confirmParams: {
            return_url: returnUrl,
            payment_method_data: {
              billing_details: {
                name: address.name.trim(),
                email: address.email.trim(),
                address: {
                  line1: address.address1.trim(),
                  line2: address.address2.trim() || undefined,
                  city: address.city.trim(),
                  state: address.state.trim().toUpperCase(),
                  postal_code: address.zip.trim(),
                  country: 'US',
                },
              },
            },
          },
          redirect: 'if_required',
        });
        if (result.error) throw { message: result.error.message ?? 'Payment failed.', issues: [] };

        goToThanks(paymentIntentId, clientSecret);
      } catch (err) {
        setError(asApiError(err));
        setBusy(false);
      }
    },
    [address, busy, createIntent, elements, frozenAt, goToThanks, onFreeze, returnUrl, stripe],
  );

  const revealForm = () => {
    onFreeze();
    setShowForm(true);
  };

  return (
    <div>
      <fieldset disabled={controlsLocked} style={{ border: 0, padding: 0, margin: 0 }}>
        <span className="field-label">Cut</span>
        <div className="chip-row" data-cols="2" role="radiogroup" aria-label="Shirt cut">
          {SHIRT_STYLES.map((value) => (
            <label className="chip" key={value}>
              <input
                type="radio"
                name="style"
                value={value}
                checked={style === value}
                onChange={() => onStyleChange(value)}
              />
              <span>{STYLE_SPECS[value].label}</span>
            </label>
          ))}
        </div>
        <p className="style-blurb">{STYLE_SPECS[style].blurb}</p>

        <span className="field-label">Size</span>
        <div className="chip-row" data-cols="7" role="radiogroup" aria-label="Shirt size">
          {SHIRT_SIZES.map((value) => (
            <label className="chip" key={value}>
              <input
                type="radio"
                name="size"
                value={value}
                checked={size === value}
                onChange={() => onSizeChange(value)}
              />
              <span>{value}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {frozenAt !== null && (
        <p className="locked">
          Your shirt will read <strong>{frozenAt}</strong>. Nobody else will ever have this
          one.{' '}
          {!busy && (
            <button type="button" className="btn-link" style={{ display: 'inline', padding: 0, marginTop: 0 }} onClick={onUnfreeze}>
              pick a new moment
            </button>
          )}
        </p>
      )}

      {error && (
        <div className="alert" role="alert">
          {error.message}
          {error.issues.length > 0 && (
            <ul>
              {error.issues.map((issue, i) => (
                <li key={i}>{issue}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div style={{ display: walletReady && !showForm ? 'block' : 'none' }}>
        <ExpressCheckoutElement
          options={{
            buttonHeight: 48,
            layout: { maxColumns: 1, maxRows: 3 },
            emailRequired: true,
            phoneNumberRequired: false,
            shippingAddressRequired: true,
            allowedShippingCountries: ['US'],
            shippingRates: SHIPPING_RATES,
            lineItems: [{ name: 'A t-shirt with a timestamp on it', amount: PRICE_CENTS }],
            business: { name: 'datetime.store' },
          }}
          onReady={({ availablePaymentMethods }) => {
            const any =
              availablePaymentMethods &&
              Object.values(availablePaymentMethods).some((v) => Boolean(v));
            setWalletReady(Boolean(any));
            if (!any) setShowForm(true);
          }}
          onClick={({ resolve }) => {
            onFreeze();
            resolve({
              emailRequired: true,
              shippingAddressRequired: true,
              allowedShippingCountries: ['US'],
              shippingRates: SHIPPING_RATES,
              lineItems: [{ name: 'A t-shirt with a timestamp on it', amount: PRICE_CENTS }],
              business: { name: 'datetime.store' },
            });
          }}
          onShippingAddressChange={({ resolve }) => resolve({ lineItems: [{ name: 'A t-shirt with a timestamp on it', amount: PRICE_CENTS }] })}
          onShippingRateChange={({ resolve }) => resolve({ lineItems: [{ name: 'A t-shirt with a timestamp on it', amount: PRICE_CENTS }] })}
          onCancel={() => setBusy(false)}
          onConfirm={handleWalletConfirm}
        />
        <button type="button" className="btn-link" onClick={revealForm}>
          Or enter your details manually
        </button>
      </div>

      {!walletReady && !showForm && (
        <button type="button" className="btn" onClick={revealForm}>
          Buy now — {formatUsd(PRICE_CENTS)}
        </button>
      )}

      {showForm && (
        <form onSubmit={handleFormSubmit} noValidate>
          {walletReady && <div className="divider">or pay by card</div>}
          <AddressForm
            value={address}
            onChange={setAddress}
            disabled={busy}
            invalid={invalid}
          />
          <div className="payment-slot">
            <PaymentElement
              options={{
                layout: { type: 'tabs', defaultCollapsed: false },
                // We collect name/email/address ourselves for shipping, and pass
                // them through as billing details at confirmation time.
                fields: { billingDetails: 'never' },
                // Wallets live in the Express Checkout Element above.
                wallets: { applePay: 'never', googlePay: 'never' },
              }}
            />
          </div>
          <button className="btn" type="submit" disabled={busy || !stripe}>
            {busy ? (
              <>
                <span className="spinner" /> Processing…
              </>
            ) : (
              <>Buy now — {formatUsd(PRICE_CENTS)}</>
            )}
          </button>
          <p className="locked" style={{ marginTop: 14, textAlign: 'center' }}>
            Free US shipping. Printed and shipped within about 4 business days.
          </p>
        </form>
      )}
    </div>
  );
}

function asApiError(err: unknown): ApiError {
  if (err && typeof err === 'object' && 'message' in err) {
    const e = err as { message?: unknown; issues?: unknown };
    return {
      message: typeof e.message === 'string' ? e.message : 'Something went wrong.',
      issues: Array.isArray(e.issues) ? (e.issues as string[]) : [],
    };
  }
  return { message: 'Something went wrong.', issues: [] };
}
