'use client';

import { useState } from 'react';

import { CheckoutPanel } from '@/components/CheckoutPanel';
import { OptionGroup } from '@/components/OptionGroup';
import { Shirt, useTicker } from '@/components/Shirt';
import {
  PRICING,
  SHIRT_SIZES,
  SHIRT_STYLES,
  SP_PRODUCTS,
  STYLE_LABELS,
  formatUsd,
  type ShirtSize,
  type ShirtStyle,
} from '@/lib/catalog';

const STYLE_OPTIONS = SHIRT_STYLES.map((value) => ({
  value,
  label: STYLE_LABELS[value],
  hint: value === 'fitted' ? 'tapered' : 'straight',
}));

const SIZE_OPTIONS = SHIRT_SIZES.map((value) => ({ value, label: value }));

export function Store() {
  const [style, setStyle] = useState<ShirtStyle>('fitted');
  const [size, setSize] = useState<ShirtSize>('M');
  /** Non-null once the customer has committed: the clock stops, that's the shirt. */
  const [frozenAt, setFrozenAt] = useState<number | null>(null);

  const timestampMs = useTicker(frozenAt);

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-14">
      {/* ------------------------------------------------------- the product */}
      <section className="lg:sticky lg:top-10 lg:self-start">
        <div className="relative overflow-hidden rounded-2xl bg-[var(--color-accent-wash)] px-4 pt-2 pb-4 sm:px-10">
          <Shirt style={style} timestampMs={timestampMs} className="w-full" />

          <div className="pointer-events-none absolute top-5 left-5 flex items-baseline gap-2 sm:top-7 sm:left-8">
            <span className="text-sm text-[var(--color-muted)] line-through">
              {formatUsd(PRICING.compareAtAmount)}
            </span>
            <span className="rounded-lg bg-[var(--color-accent)] px-2.5 py-1 text-sm font-medium text-white">
              {formatUsd(PRICING.amount)}
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm text-[var(--color-muted)]">
          <p>
            {/* Zero-width placeholder keeps the line from reflowing on mount. */}
            <span
              className={`tnum text-[var(--color-ink)] ${timestampMs === null ? 'opacity-0' : ''}`}
              aria-live="off"
            >
              {timestampMs ?? 1_000_000_000_000}
            </span>{' '}
            {frozenAt === null ? 'and counting' : '— locked in'}
          </p>
          <p>
            {SP_PRODUCTS[style].label} · Black · direct-to-garment, 8″ front print
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------- the checkout */}
      <section className="space-y-6">
        <div className="space-y-4">
          <OptionGroup
            label="Cut"
            name="style"
            value={style}
            options={STYLE_OPTIONS}
            onChange={setStyle}
          />
          <OptionGroup label="Size" name="size" value={size} options={SIZE_OPTIONS} onChange={setSize} />
        </div>

        <div className="h-px bg-[var(--color-hairline)]" />

        <CheckoutPanel style={style} size={size} onFreeze={setFrozenAt} />
      </section>
    </div>
  );
}
