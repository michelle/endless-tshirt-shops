'use client';

import { useMemo, useState } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe, type Appearance, type StripeElementsOptions } from '@stripe/stripe-js';

import ShirtPreview from './ShirtPreview';
import CheckoutForm from './CheckoutForm';
import OptionPicker from './OptionPicker';
import {
  CURRENCY,
  PRICE_CENTS,
  SHIRT_SIZES,
  SHIRT_STYLES,
  STYLE_BLURBS,
  STYLE_LABELS,
  type ShirtSize,
  type ShirtStyle,
} from '@/lib/catalog';

const appearance: Appearance = {
  theme: 'stripe',
  variables: {
    colorPrimary: '#0284c7',
    colorText: '#0f172a',
    colorDanger: '#b91c1c',
    borderRadius: '8px',
    fontSizeBase: '15px',
    spacingUnit: '4px',
  },
};

const STYLE_OPTIONS = SHIRT_STYLES.map((value) => ({ value, label: STYLE_LABELS[value] }));
const SIZE_OPTIONS = SHIRT_SIZES.map((value) => ({ value, label: value }));

export default function Store({ publishableKey }: { publishableKey: string }) {
  const [style, setStyle] = useState<ShirtStyle>('fitted');
  const [size, setSize] = useState<ShirtSize>('M');
  const [frozenEpoch, setFrozenEpoch] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const stripePromise = useMemo(() => loadStripe(publishableKey), [publishableKey]);

  // Deferred intent creation: Elements knows the amount up front, and the
  // PaymentIntent is only created once the print job has been booked.
  const options: StripeElementsOptions = useMemo(
    () => ({
      mode: 'payment',
      amount: PRICE_CENTS,
      currency: CURRENCY,
      captureMethod: 'automatic',
      appearance,
    }),
    [],
  );

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-14">
      <section className="flex flex-col items-center lg:items-start">
        <ShirtPreview style={style} frozenEpoch={frozenEpoch} />
        <p className="mt-6 max-w-md text-center text-sm leading-relaxed text-slate-500 lg:text-left">
          {STYLE_BLURBS[style]} Printed direct-to-garment in white ink, 8&quot; across the
          chest. {frozenEpoch === null
            ? 'The number is live — whatever it reads when you press buy is what we print.'
            : 'Locked in. That number is yours.'}
        </p>
      </section>

      <section className="lg:pt-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/[0.04] sm:p-6">
          <div className="space-y-5">
            <OptionPicker
              legend="Cut"
              options={STYLE_OPTIONS}
              value={style}
              onChange={setStyle}
              disabled={busy}
            />
            <OptionPicker
              legend="Size"
              options={SIZE_OPTIONS}
              value={size}
              onChange={setSize}
              disabled={busy}
            />

            <hr className="border-slate-200" />

            <Elements stripe={stripePromise} options={options}>
              <CheckoutForm
                style={style}
                size={size}
                onFreeze={setFrozenEpoch}
                onBusyChange={setBusy}
              />
            </Elements>
          </div>
        </div>
      </section>
    </div>
  );
}
