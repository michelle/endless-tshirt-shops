'use client';

import { useCallback, useMemo, useState } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import Shirt from './Shirt';
import CheckoutForm from './CheckoutForm';
import Success from './Success';
import { type Size, type Style } from '@/lib/catalog';
import type { FulfillmentState } from '@/lib/fulfillment';

export interface OrderOutcome {
  reference: string;
  orderId: string | null;
  state: FulfillmentState;
  message: string;
  capturedAt: number;
  style: Style;
  size: Size;
  email: string;
  amount: number;
}

export default function Store({ publishableKey }: { publishableKey: string }) {
  const [style, setStyle] = useState<Style>('fitted');
  const [size, setSize] = useState<Size>('M');
  const [frozenAt, setFrozenAt] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<OrderOutcome | null>(null);

  // loadStripe caches internally, but keep one promise per key regardless.
  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey],
  );

  const handleCapture = useCallback(() => {
    const now = Date.now();
    setFrozenAt(now);
    return now;
  }, []);

  const handleRelease = useCallback(() => setFrozenAt(null), []);

  const handleReset = useCallback(() => {
    setOutcome(null);
    setFrozenAt(null);
  }, []);

  if (!publishableKey) {
    return (
      <div className="alert alert-error" role="alert">
        The store is missing <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>, so checkout is
        disabled.
      </div>
    );
  }

  return (
    <div className="columns">
      <div>
        <div className="sticky">
          <Shirt style={style} frozenAt={outcome ? outcome.capturedAt : frozenAt} />
        </div>
      </div>

      <div>
        {outcome ? (
          <Success outcome={outcome} onReset={handleReset} />
        ) : (
          <Elements stripe={stripePromise}>
            <CheckoutForm
              style={style}
              size={size}
              onStyleChange={setStyle}
              onSizeChange={setSize}
              onCapture={handleCapture}
              onRelease={handleRelease}
              onComplete={setOutcome}
            />
          </Elements>
        )}
      </div>
    </div>
  );
}
