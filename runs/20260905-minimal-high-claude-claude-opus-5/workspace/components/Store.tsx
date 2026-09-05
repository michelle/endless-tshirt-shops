'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe, type Appearance, type Stripe } from '@stripe/stripe-js';
import Shirt from './Shirt';
import Checkout, { type ReturnedSession } from './Checkout';
import OptionPicker from './OptionPicker';
import {
  SHIRT_SIZES,
  SHIRT_STYLES,
  STYLE_SPECS,
  type ShirtSize,
  type ShirtStyle,
} from '@/lib/products';

export type Session = { clientSecret: string; paymentIntentId: string };

const appearance: Appearance = {
  theme: 'stripe',
  variables: {
    colorPrimary: '#337ab7',
    colorText: '#1a1a1a',
    colorDanger: '#eb1c26',
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    fontSizeBase: '16px',
    borderRadius: '2px',
    spacingUnit: '4px',
  },
  rules: {
    '.Input': {
      border: 'none',
      borderBottom: '1px solid #a4d5ff',
      boxShadow: 'none',
      padding: '6px 0',
    },
    '.Input:focus': { borderBottom: '1px solid #337ab7', boxShadow: 'none' },
    '.Input--invalid': {
      borderBottom: '1px solid #eb1c26',
      boxShadow: 'none',
      color: '#eb1c26',
    },
    '.Label': {
      color: '#9b9b9b',
      fontSize: '13px',
      marginBottom: '2px',
    },
    '.Tab': { border: '1px solid #eee', boxShadow: 'none' },
    '.Tab--selected': { borderColor: '#337ab7', color: '#337ab7' },
  },
};

let stripePromise: Promise<Stripe | null> | null = null;
function getStripe(key: string) {
  if (!stripePromise) stripePromise = loadStripe(key);
  return stripePromise;
}

type Props = {
  priceCents: number;
  listPriceCents: number;
  publishableKey: string;
};

export default function Store({ priceCents, publishableKey }: Props) {
  const [style, setStyle] = useState<ShirtStyle>('fitted');
  const [size, setSize] = useState<ShirtSize>('M');
  const [frozenTs, setFrozenTs] = useState<number | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [returned, setReturned] = useState<ReturnedSession | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const starting = useRef(false);

  const startSession = useCallback(async () => {
    if (starting.current) return;
    starting.current = true;
    setBootError(null);
    try {
      const res = await fetch('/api/checkout', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Could not start checkout');
      setSession({
        clientSecret: json.clientSecret,
        paymentIntentId: json.paymentIntentId,
      });
    } catch (err) {
      setBootError(
        err instanceof Error ? err.message : 'Could not start checkout',
      );
    } finally {
      starting.current = false;
    }
  }, []);

  // A redirect-based payment method (or a wallet that needed a bank app) sends
  // the buyer back here with their intent in the query string. Pick it up
  // instead of opening a fresh one.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const clientSecret = params.get('payment_intent_client_secret');
    const paymentIntentId = params.get('payment_intent');
    if (clientSecret && paymentIntentId) {
      setSession({ clientSecret, paymentIntentId });
      setReturned({ clientSecret, paymentIntentId });
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }
    void startSession();
  }, [startSession]);

  const reset = useCallback(() => {
    setSession(null);
    setReturned(null);
    setFrozenTs(null);
    void startSession();
  }, [startSession]);

  const freezeNow = useCallback(() => {
    const ts = Date.now();
    setFrozenTs(ts);
    return ts;
  }, []);

  const unfreeze = useCallback(() => setFrozenTs(null), []);

  const options = useMemo(
    () => (session ? { clientSecret: session.clientSecret, appearance } : null),
    [session],
  );

  return (
    <div className="Store">
      <div className="Store-shirt">
        <Shirt style={style} frozenTs={frozenTs} />
        <p className="Shirt-caption">
          {STYLE_SPECS[style].blank} in black · direct-to-garment print
        </p>
      </div>

      <div className="Checkout">
        <OptionPicker
          name="style"
          legend="Cut"
          value={style}
          disabled={frozenTs !== null}
          options={SHIRT_STYLES.map((s) => ({
            value: s,
            label: STYLE_SPECS[s].label,
          }))}
          onChange={setStyle}
        />
        <OptionPicker
          name="size"
          legend="Size"
          value={size}
          disabled={frozenTs !== null}
          options={SHIRT_SIZES.map((s) => ({ value: s, label: s }))}
          onChange={setSize}
        />

        {bootError && (
          <div className="alert" role="alert">
            {bootError}{' '}
            <button className="Checkout-or" onClick={() => void startSession()}>
              Try again
            </button>
          </div>
        )}

        {!publishableKey && (
          <div className="alert" role="alert">
            Payments are not configured for this deployment
            (NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is missing).
          </div>
        )}

        {publishableKey && !session && !bootError && (
          <div className="Checkout-skeleton" aria-label="Loading checkout" />
        )}

        {publishableKey && session && options && (
          <Elements
            key={session.clientSecret}
            stripe={getStripe(publishableKey)}
            options={options}
          >
            <Checkout
              session={session}
              returned={returned}
              style={style}
              size={size}
              priceCents={priceCents}
              freezeNow={freezeNow}
              unfreeze={unfreeze}
              onReset={reset}
            />
          </Elements>
        )}
      </div>
    </div>
  );
}
