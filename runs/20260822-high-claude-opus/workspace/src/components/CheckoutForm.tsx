'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AddressElement,
  ExpressCheckoutElement,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';

import { renderArtwork } from '@/lib/renderArtwork';
import { PRICE_CENTS, formatUsd, type ShirtSize, type ShirtStyle } from '@/lib/catalog';

export type AddressPayload = {
  name: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

type Props = {
  style: ShirtStyle;
  size: ShirtSize;
  /** Freezes the ticking preview; `null` resumes it. */
  onFreeze: (epochMs: number | null) => void;
  onBusyChange: (busy: boolean) => void;
};

/**
 * One submit does the whole thing: freeze the timestamp, render the print
 * artwork, ask the server for a PaymentIntent (which also books the print job
 * with Scalable Press), then confirm the payment.
 */
export default function CheckoutForm({ style, size, onFreeze, onBusyChange }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [walletReady, setWalletReady] = useState(false);
  const inFlight = useRef(false);

  const setBusyBoth = useCallback(
    (next: boolean) => {
      setBusy(next);
      onBusyChange(next);
    },
    [onBusyChange],
  );

  const checkout = useCallback(
    async (address: AddressPayload, buyerEmail: string, alreadySubmitted: boolean) => {
      if (!stripe || !elements) throw new Error('Payments are still loading.');
      if (inFlight.current) return;
      inFlight.current = true;

      setError(null);
      setIssues([]);
      setBusyBoth(true);

      // The instant of purchase — this is the number that gets printed.
      const epochMs = Date.now();
      onFreeze(epochMs);

      try {
        if (!alreadySubmitted) {
          const { error: submitError } = await elements.submit();
          if (submitError) throw new Error(submitError.message ?? 'Check your payment details.');
        }

        const artwork = await renderArtwork(epochMs);

        const response = await fetch('/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ style, size, epochMs, artwork, email: buyerEmail, address }),
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          if (Array.isArray(payload.issues) && payload.issues.length) setIssues(payload.issues);
          throw new Error(payload.error ?? 'We could not start this order.');
        }

        const { error: confirmError } = await stripe.confirmPayment({
          elements,
          clientSecret: payload.clientSecret,
          redirect: 'if_required',
          confirmParams: {
            return_url: `${window.location.origin}/order/${payload.paymentIntentId}`,
          },
        });
        if (confirmError) throw new Error(confirmError.message ?? 'Your payment was declined.');

        router.push(
          `/order/${payload.paymentIntentId}?payment_intent_client_secret=${encodeURIComponent(
            payload.clientSecret,
          )}`,
        );
      } catch (err) {
        // Let the clock run again so the next attempt prints an honest time.
        onFreeze(null);
        setBusyBoth(false);
        setError(err instanceof Error ? err.message : 'Something went wrong.');
      } finally {
        inFlight.current = false;
      }
    },
    [stripe, elements, style, size, onFreeze, setBusyBoth, router],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!elements) return;

    const addressElement = elements.getElement('address');
    const value = await addressElement?.getValue();
    if (!value?.complete) {
      setError('Please finish filling in your shipping address.');
      return;
    }
    if (!email.trim()) {
      setError('We need an email address to send your receipt to.');
      return;
    }

    const a = value.value;
    await checkout(
      {
        name: a.name,
        line1: a.address.line1,
        line2: a.address.line2,
        city: a.address.city,
        state: a.address.state,
        postalCode: a.address.postal_code,
        country: a.address.country,
      },
      email.trim(),
      false,
    );
  };

  return (
    <div className="space-y-5">
      {/* Apple Pay / Google Pay, when the browser offers one. */}
      <div className={walletReady ? 'space-y-3' : 'hidden'}>
        <ExpressCheckoutElement
          options={{
            buttonHeight: 48,
            buttonType: { applePay: 'buy', googlePay: 'buy' },
            emailRequired: true,
            shippingAddressRequired: true,
            allowedShippingCountries: ['US'],
            shippingRates: [
              { id: 'free', displayName: 'Free shipping', amount: 0 },
            ],
          }}
          onReady={(event) => {
            setWalletReady(Boolean(event.availablePaymentMethods));
          }}
          onShippingAddressChange={(event) => event.resolve({})}
          onConfirm={async (event) => {
            const shipping = event.shippingAddress;
            const buyerEmail = event.billingDetails?.email ?? email.trim();
            if (!shipping?.address || !buyerEmail) {
              setError('Your wallet did not share a shipping address and email.');
              return;
            }
            await checkout(
              {
                name: shipping.name ?? event.billingDetails?.name ?? '',
                line1: shipping.address.line1 ?? '',
                line2: shipping.address.line2 ?? null,
                city: shipping.address.city ?? '',
                state: shipping.address.state ?? '',
                postalCode: shipping.address.postal_code ?? '',
                country: shipping.address.country ?? 'US',
              },
              buyerEmail,
              true,
            );
          }}
        />
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.14em] text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          or enter details manually
          <span className="h-px flex-1 bg-slate-200" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {issues.length > 0 && (
          <ul className="space-y-1 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        )}

        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"
          >
            Email (for receipt)
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            disabled={busy}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="jenny.rosen@example.com"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-[15px] text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/25 disabled:bg-slate-50"
          />
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Ships to
          </span>
          <AddressElement
            options={{
              mode: 'shipping',
              allowedCountries: ['US'],
              fields: { phone: 'never' },
              display: { name: 'full' },
            }}
          />
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Payment
          </span>
          <PaymentElement options={{ layout: 'tabs' }} />
        </div>

        {error && (
          <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || !stripe || !elements}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-[15px] font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/30 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Processing…
            </>
          ) : (
            <>Buy now · {formatUsd(PRICE_CENTS)}</>
          )}
        </button>

        <p className="text-center text-xs text-slate-500">
          Free shipping in the US. The timestamp is fixed the moment you press buy.
        </p>
      </form>
    </div>
  );
}
