'use client';

import { useEffect, useRef } from 'react';
import { SHIRT_PATHS } from '@/lib/shirt-path';
import type { Style } from '@/lib/catalog';

/**
 * The shirt, with the current epoch millisecond printed across the chest.
 *
 * The number is driven straight off requestAnimationFrame into a text node
 * rather than through React state — re-rendering the tree 60 times a second to
 * change 13 characters would be silly, and it would make the whole page janky
 * on a phone.
 */
export function Shirt({ style, frozenAt }: { style: Style; frozenAt: number | null }) {
  const printRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // Once the buyer commits, the shirt shows the moment they bought it.
    if (frozenAt !== null) {
      if (printRef.current) printRef.current.textContent = String(frozenAt);
      return;
    }

    let raf = 0;
    const tick = () => {
      if (printRef.current) printRef.current.textContent = String(Date.now());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [frozenAt]);

  return (
    <div className="shirt">
      <svg viewBox="0 0 100 102" role="img" aria-label="Black t-shirt printed with the current Unix timestamp in milliseconds">
        <path d={SHIRT_PATHS[style]} fill="#111111" fillRule="evenodd" clipRule="evenodd" />
      </svg>
      <div className="shirt-print">
        {/* Rendered server-side as a stable placeholder so the digits do not
            pop in; the effect above takes over on hydration. */}
        <span ref={printRef} suppressHydrationWarning>
          {frozenAt ?? '0000000000000'}
        </span>
      </div>
    </div>
  );
}
