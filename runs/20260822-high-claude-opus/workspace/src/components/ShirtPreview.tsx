'use client';

import { useEffect, useRef } from 'react';

import { SHIRT_PATHS, SHIRT_VIEWBOX } from '@/lib/shirtPaths';
import { LIST_PRICE_CENTS, PRICE_CENTS, formatUsd, type ShirtStyle } from '@/lib/catalog';

type Props = {
  style: ShirtStyle;
  /** Once set, the shirt stops ticking — this is the moment being bought. */
  frozenEpoch: number | null;
};

/**
 * The product. A black tee with the current epoch millisecond across the chest,
 * repainted every frame until the customer buys it.
 */
export default function ShirtPreview({ style, frozenEpoch }: Props) {
  const timeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (frozenEpoch !== null) {
      if (timeRef.current) timeRef.current.textContent = String(frozenEpoch);
      return;
    }

    let raf = 0;
    const tick = () => {
      if (timeRef.current) timeRef.current.textContent = String(Date.now());
      raf = window.requestAnimationFrame(tick);
    };
    tick();
    return () => window.cancelAnimationFrame(raf);
  }, [frozenEpoch]);

  return (
    <div className="relative w-full max-w-[600px]">
      <svg
        viewBox={SHIRT_VIEWBOX}
        width="100%"
        aria-label={`${style} black t-shirt printed with an epoch millisecond timestamp`}
        role="img"
        className="w-full drop-shadow-[0_18px_40px_rgba(15,23,42,0.18)]"
      >
        <path
          d={SHIRT_PATHS[style]}
          fillRule="evenodd"
          clipRule="evenodd"
          className="fill-slate-900 transition-[d] duration-200"
        />
      </svg>

      {/* The print, positioned over the chest. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-[24%] flex justify-center"
        aria-hidden="true"
      >
        <div
          ref={timeRef}
          data-testid="shirt-timestamp"
          className={`font-mono text-[clamp(1rem,3.6vw,1.85rem)] font-bold tracking-[0.1em] text-white tabular-nums transition-opacity ${
            frozenEpoch !== null ? 'opacity-100' : 'opacity-95'
          }`}
        >
          {frozenEpoch ?? ''}
        </div>
      </div>

      <div className="absolute left-[20%] top-[62%]">
        <span className="inline-flex items-baseline gap-2 rounded-full bg-sky-600 px-3.5 py-1.5 text-white shadow-lg shadow-sky-600/25">
          <s className="text-sm font-light text-sky-100/80">{formatUsd(LIST_PRICE_CENTS)}</s>
          <span className="text-lg font-medium tabular-nums">{formatUsd(PRICE_CENTS)}</span>
        </span>
      </div>
    </div>
  );
}
