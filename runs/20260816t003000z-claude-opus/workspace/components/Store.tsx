'use client';

import { Elements } from '@stripe/react-stripe-js';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { useMemo, useState } from 'react';
import type { Size, Style } from '@/lib/catalog';
import CheckoutForm, { type CompletedOrder } from './CheckoutForm';
import ShirtPreview from './ShirtPreview';
import SuccessPanel from './SuccessPanel';

interface Props {
  publishableKey: string;
  /** Resolved font-family for the printed timestamp, from next/font. */
  printFontFamily: string;
  /** True when the app is wired to a Stripe test key. */
  testMode: boolean;
  /** True when Scalable Press orders are only validated, not submitted. */
  dryRun: boolean;
}

export default function Store({ publishableKey, printFontFamily, testMode, dryRun }: Props) {
  const [style, setStyle] = useState<Style>('fitted');
  const [size, setSize] = useState<Size>('M');
  const [frozenAt, setFrozenAt] = useState<number | null>(null);
  const [order, setOrder] = useState<CompletedOrder | null>(null);

  // loadStripe hits the network, so keep exactly one promise per mount.
  const stripePromise = useMemo<Promise<Stripe | null>>(
    () => loadStripe(publishableKey),
    [publishableKey],
  );

  return (
    <div className="columns">
      <div>
        <ShirtPreview style={order ? order.style : style} frozenAt={order?.timestamp ?? frozenAt} />
      </div>

      <div>
        {testMode && !order && (
          <div className="notice">
            <strong>Test mode.</strong> Pay with <code>4242 4242 4242 4242</code>, any future expiry
            and any CVC. No money moves
            {dryRun ? ' and no garment is sent to production' : ''}.
          </div>
        )}

        {order ? (
          <SuccessPanel
            order={order}
            onReset={() => {
              setOrder(null);
              setFrozenAt(null);
            }}
          />
        ) : (
          <Elements stripe={stripePromise}>
            <CheckoutForm
              style={style}
              size={size}
              onStyleChange={setStyle}
              onSizeChange={setSize}
              onFreeze={setFrozenAt}
              onComplete={setOrder}
              printFontFamily={printFontFamily}
            />
          </Elements>
        )}
      </div>
    </div>
  );
}
