'use client';

import {
  AddressElement,
  Elements,
  ExpressCheckoutElement,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import type { StripeAddressElementChangeEvent, StripeError } from '@stripe/stripe-js';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';

import { PRICING, formatUsd, type ShirtSize, type ShirtStyle } from '@/lib/catalog';
import {
  PurchaseError,
  orderPath,
  orderReturnUrl,
  preparePurchase,
  type PurchaseAddress,
  type PurchaseIssue,
} from '@/lib/purchase';
import { elementsOptions, getStripe } from '@/lib/stripe-client';

/**
 * Checkout uses Stripe's deferred-intent flow: the customer fills everything in
 * first, and only on submit do we freeze the timestamp, get the printer to
 * commit to the order, and create the PaymentIntent. That ordering matters —
 * the number on the shirt is the moment you pressed the button, and we never
 * charge for a shirt the printer has already refused.
 *
 * Wallets (Apple Pay / Google Pay) live in their own Elements group so their
 * validation is independent of the card form's.
 */

type PanelProps = {
  style: ShirtStyle;
  size: ShirtSize;
  onFreeze: (timestampMs: number | null) => void;
};

type Purchase = {
  style: ShirtStyle;
  size: ShirtSize;
  email: string;
  address: PurchaseAddress;
};

const stripePromise = getStripe();

export function CheckoutPanel(props: PanelProps) {
  return (
    <div className="space-y-5">
      <Elements stripe={stripePromise} options={elementsOptions}>
        <WalletCheckout {...props} />
      </Elements>
      <Elements stripe={stripePromise} options={elementsOptions}>
        <CardCheckout {...props} />
      </Elements>
    </div>
  );
}

/* ------------------------------------------------------------------ shared */

/**
 * Freezes the clock, prepares the order, confirms the payment, and routes to the
 * confirmation page. Returns an error message, or null when it has navigated.
 */
function useConfirmPurchase(onFreeze: (t: number | null) => void) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  /** Reused across retries so a declined card doesn't orphan a PaymentIntent. */
  const intentIdRef = useRef<string | undefined>(undefined);

  const run = useCallback(
    async (purchase: Purchase): Promise<{ error: string; issues: PurchaseIssue[] } | null> => {
      if (!stripe || !elements) {
        return { error: 'Payments are still loading — try again in a second.', issues: [] };
      }

      // This is the moment the customer bought, and therefore the shirt.
      const timestampMs = Date.now();
      onFreeze(timestampMs);

      try {
        const prepared = await preparePurchase({
          timestampMs,
          style: purchase.style,
          size: purchase.size,
          email: purchase.email,
          address: purchase.address,
          paymentIntentId: intentIdRef.current,
        });
        intentIdRef.current = prepared.paymentIntentId;

        const { error, paymentIntent } = await stripe.confirmPayment({
          elements,
          clientSecret: prepared.clientSecret,
          confirmParams: { return_url: orderReturnUrl() },
          redirect: 'if_required',
        });

        if (error) {
          onFreeze(null);
          return { error: describeStripeError(error), issues: [] };
        }

        // No redirect was needed (cards, wallets): go to the confirmation page,
        // which triggers fulfilment and then polls for the printer's order id.
        router.push(orderPath(prepared.paymentIntentId, prepared.clientSecret));
        if (paymentIntent?.status && paymentIntent.status !== 'succeeded') {
          return null;
        }
        return null;
      } catch (cause) {
        onFreeze(null);
        if (cause instanceof PurchaseError) {
          return { error: cause.message, issues: cause.issues };
        }
        return {
          error: cause instanceof Error ? cause.message : 'Something went wrong. Please try again.',
          issues: [],
        };
      }
    },
    [stripe, elements, onFreeze, router],
  );

  return run;
}

function describeStripeError(error: StripeError): string {
  if (error.type === 'card_error' || error.type === 'validation_error') {
    return error.message ?? 'Your card was declined.';
  }
  return error.message ?? 'The payment could not be completed.';
}

/* ------------------------------------------------------------------ wallets */

function WalletCheckout({ style, size, onFreeze }: PanelProps) {
  const elements = useElements();
  const confirm = useConfirmPurchase(onFreeze);
  const [available, setAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!available && !error) {
    // Render the element but keep the surrounding chrome hidden until Stripe
    // confirms a wallet is actually usable on this device.
    return (
      <div className="sr-only" aria-hidden>
        <WalletElement
          elements={elements}
          confirm={confirm}
          style={style}
          size={size}
          onReady={setAvailable}
          onError={setError}
        />
      </div>
    );
  }

  return (
    <div className="dt-rise">
      {error ? (
        <p className="mb-3 text-sm text-[var(--color-danger)]">{error}</p>
      ) : null}
      <WalletElement
        elements={elements}
        confirm={confirm}
        style={style}
        size={size}
        onReady={setAvailable}
        onError={setError}
      />
      <div className="mt-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-[var(--color-hairline)]" />
        <span className="text-xs tracking-wide text-[var(--color-muted)] uppercase">
          or pay by card
        </span>
        <span className="h-px flex-1 bg-[var(--color-hairline)]" />
      </div>
    </div>
  );
}

function WalletElement({
  elements,
  confirm,
  style,
  size,
  onReady,
  onError,
}: {
  elements: ReturnType<typeof useElements>;
  confirm: ReturnType<typeof useConfirmPurchase>;
  style: ShirtStyle;
  size: ShirtSize;
  onReady: (available: boolean) => void;
  onError: (message: string | null) => void;
}) {
  return (
    <ExpressCheckoutElement
      options={{
        buttonHeight: 48,
        buttonTheme: { applePay: 'black', googlePay: 'black' },
        layout: { maxColumns: 1, maxRows: 2 },
        // Just the one-tap wallets, which is what the original store's Payment
        // Request button offered. Link is already reachable from the email
        // field below, and the redirect-based methods live in the card form's
        // own method tabs — no need to duplicate either here.
        paymentMethods: {
          applePay: 'auto',
          googlePay: 'auto',
          link: 'never',
          amazonPay: 'never',
          paypal: 'never',
          klarna: 'never',
        },
      }}
      onReady={({ availablePaymentMethods }) => {
        onReady(Boolean(availablePaymentMethods && Object.keys(availablePaymentMethods).length > 0));
      }}
      onClick={({ resolve }) => {
        resolve({
          emailRequired: true,
          phoneNumberRequired: false,
          shippingAddressRequired: true,
          allowedShippingCountries: ['US'],
          shippingRates: [
            {
              id: 'free-shipping',
              displayName: 'Free shipping',
              amount: PRICING.shippingAmount,
            },
          ],
          lineItems: [{ name: 'datetime shirt', amount: PRICING.amount }],
        });
      }}
      onShippingAddressChange={({ resolve }) => {
        // One flat rate, so any US address is fine as-is.
        resolve({});
      }}
      onCancel={() => onError(null)}
      onConfirm={async (event) => {
        onError(null);
        if (!elements) return;

        const { error: submitError } = await elements.submit();
        if (submitError) {
          onError(submitError.message ?? 'Please check your details.');
          return;
        }

        const shipping = event.shippingAddress;
        const email = event.billingDetails?.email;
        if (!shipping?.address?.line1 || !shipping.address.postal_code || !email) {
          onError('Your wallet did not share a complete shipping address.');
          return;
        }

        const failure = await confirm({
          style,
          size,
          email,
          address: {
            name: shipping.name ?? event.billingDetails?.name ?? '',
            address1: shipping.address.line1,
            address2: shipping.address.line2 ?? undefined,
            city: shipping.address.city ?? '',
            state: shipping.address.state ?? '',
            zip: shipping.address.postal_code,
            country: 'US',
          },
        });
        if (failure) onError(failure.error);
      }}
    />
  );
}

/* --------------------------------------------------------------- card form */

function CardCheckout({ style, size, onFreeze }: PanelProps) {
  const elements = useElements();
  const confirm = useConfirmPurchase(onFreeze);

  const [email, setEmail] = useState('');
  const [address, setAddress] = useState<StripeAddressElementChangeEvent['value'] | null>(null);
  const [addressComplete, setAddressComplete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<PurchaseIssue[]>([]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || !elements) return;

    setError(null);
    setIssues([]);

    if (!email) {
      setError('We need an email address to send your receipt.');
      return;
    }
    if (!address || !addressComplete || !address.address.line1 || !address.address.postal_code) {
      setError('Please complete your shipping address.');
      return;
    }

    setBusy(true);
    const { error: submitError } = await elements.submit();
    if (submitError) {
      setBusy(false);
      setError(submitError.message ?? 'Please check your card details.');
      return;
    }

    const failure = await confirm({
      style,
      size,
      email,
      address: {
        name: address.name,
        address1: address.address.line1,
        address2: address.address.line2 ?? undefined,
        city: address.address.city,
        state: address.address.state,
        zip: address.address.postal_code,
        country: 'US',
        phone: address.phone,
      },
    });

    if (failure) {
      setBusy(false);
      setError(failure.error);
      setIssues(failure.issues);
    }
    // On success `confirm` navigates away; leave the button in its busy state.
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error ? (
        <div
          role="alert"
          className="dt-rise rounded-xl border border-[#f3c9c6] bg-[#fdf3f2] px-4 py-3 text-sm text-[var(--color-danger)]"
        >
          <p className="font-medium">{error}</p>
          {issues.length ? (
            <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-[13px] opacity-90">
              {issues.map((issue, index) => (
                <li key={`${issue.code ?? 'issue'}-${index}`}>{issue.message ?? issue.code}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {/*
       * A plain input rather than LinkAuthenticationElement. Handing Stripe an
       * email pre-opts the customer into Link signup, which silently makes
       * "Mobile number" a *required* field inside the card form — leave it blank
       * and submit dies on "Your phone number is incomplete." with the message
       * rendered at the top of the form, nowhere near the field that caused it.
       * We only need the email for the receipt. Link is still offered as a
       * payment method in the tabs below for people who already use it.
       */}
      <div className="space-y-1">
        <label htmlFor="email" className="block text-[15px] font-medium text-[var(--color-muted)]">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value.trim())}
          className="h-[42px] w-full rounded-[10px] border border-[var(--color-hairline)] px-3 text-[15px] text-[var(--color-ink)] outline-none placeholder:text-[#9aa1ab] focus:border-[var(--color-accent)] focus:ring-3 focus:ring-[rgba(51,122,183,0.15)]"
        />
      </div>

      <AddressElement
        options={{
          mode: 'shipping',
          allowedCountries: ['US'],
          autocomplete: { mode: 'automatic' },
          // Shown but optional: couriers like a phone number, customers don't.
          fields: { phone: 'always' },
          validation: { phone: { required: 'never' } },
          display: { name: 'full' },
        }}
        onChange={(event) => {
          setAddress(event.value);
          setAddressComplete(event.complete);
        }}
      />

      <PaymentElement options={{ layout: { type: 'tabs', defaultCollapsed: false } }} />

      <button
        type="submit"
        disabled={busy}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-ink)] text-[15px] font-medium text-white transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? (
          <>
            <Spinner />
            Placing your order…
          </>
        ) : (
          <>Buy now · {formatUsd(PRICING.amount)}</>
        )}
      </button>

      <p className="text-center text-xs text-[var(--color-muted)]">
        Free US shipping. Payments handled by Stripe — we never see your card details.
      </p>
    </form>
  );
}

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" className="dt-spin h-4 w-4" aria-hidden>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
