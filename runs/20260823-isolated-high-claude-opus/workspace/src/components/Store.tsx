'use client';

import { useCallback, useEffect, useState } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { CURRENCY, PRICE_CENTS, type ShirtSize, type ShirtStyle } from '@/lib/catalog';
import { waitForFont } from '@/lib/artwork';
import { getStripe, STRIPE_APPEARANCE } from '@/lib/stripe-client';
import { Checkout } from './Checkout';
import { Shirt } from './Shirt';

type Props = { font: string; publishableKey: string };

export function Store({ font, publishableKey }: Props) {
  const [style, setStyle] = useState<ShirtStyle>('fitted');
  const [size, setSize] = useState<ShirtSize>('M');
  /** Null while the counter is still running. Set the instant checkout begins. */
  const [frozenAt, setFrozenAt] = useState<number | null>(null);
  const [fontReady, setFontReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    waitForFont(font).then(() => {
      if (!cancelled) setFontReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [font]);

  /**
   * Stops the clock. Called the moment the customer commits to buying — opening
   * a wallet sheet or revealing the card form — so the timestamp they saw when
   * they decided is the timestamp that gets printed.
   */
  const freeze = useCallback(() => {
    let value = frozenAt;
    if (value === null) {
      value = Date.now();
      setFrozenAt(value);
    }
    return value;
  }, [frozenAt]);

  const unfreeze = useCallback(() => setFrozenAt(null), []);

  const stripePromise = getStripe(publishableKey);

  return (
    <div className="columns">
      <div>
        <Shirt style={style} frozenAt={frozenAt} font={font} />
      </div>
      <div>
        {stripePromise ? (
          <Elements
            stripe={stripePromise}
            options={{
              mode: 'payment',
              amount: PRICE_CENTS,
              currency: CURRENCY,
              appearance: STRIPE_APPEARANCE,
            }}
          >
            <Checkout
              style={style}
              size={size}
              onStyleChange={setStyle}
              onSizeChange={setSize}
              frozenAt={frozenAt}
              onFreeze={freeze}
              onUnfreeze={unfreeze}
              font={font}
            />
          </Elements>
        ) : (
          <div className="alert" role="alert">
            This shop is not finished setting up: no Stripe publishable key is configured.
          </div>
        )}
        {!fontReady && (
          <p className="locked" style={{ marginTop: 18 }}>
            Loading the typeface the shirts are printed in…
          </p>
        )}
      </div>
    </div>
  );
}
