'use client';

import { useEffect, useRef } from 'react';
import {
  LIST_PRICE_CENTS,
  PRICE_CENTS,
  STYLES,
  formatUsd,
  type ShirtStyle,
} from '@/lib/catalog';

/**
 * The product. An SVG tee (fitted or unisex silhouette, both taken from the
 * original store) with the live epoch-millisecond clock printed across the chest.
 *
 * The clock stops when `frozenAt` is set — that is the millisecond the customer
 * bought, and from then on the shirt shows exactly what will be printed.
 */

const PATHS: Record<ShirtStyle, string> = {
  fitted:
    'M79.312,15.149c-1.629-1.631-16.117-6.146-16.117-6.146s-4.31,8.721-11.66,8.721s-11.66-8.721-11.66-8.721   s-15.354,4.936-16.486,6.068c-1.13,1.13-13.712,16.992-13.712,16.992l10.081,8.37l6.614-5.518c0,0,14.411,23.971,1.384,58.875   c0,0,43.546,10.767,47.434,0c-9.689-43.26,1.379-58.613,1.379-58.613l6.267,5.228l9.35-11.117   C92.185,29.288,80.945,16.781,79.312,15.149z',
  unisex:
    'M79.313,6.142C77.683,4.511,63.196,4,63.196,4s-9.844,13.724-11.661,13.724   C49.719,17.724,39.875,4,39.875,4S24.521,4.932,23.389,6.064c-1.13,1.13-22.827,24.89-22.827,24.89L16.71,42.975l9.662-8.06   l1.384,58.875c0,0,43.541,10.705,47.433,0l1.379-58.613l9.347,7.797L100,30.953C100,30.953,80.945,7.774,79.313,6.142z',
};

export default function Shirt({
  style,
  frozenAt,
  showPrice = true,
  showCaption = true,
}: {
  style: ShirtStyle;
  frozenAt?: number | null;
  /** Both off on the confirmation page: it is no longer an offer, it is an order. */
  showPrice?: boolean;
  showCaption?: boolean;
}) {
  const stampRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = stampRef.current;
    if (!node) return;

    if (frozenAt) {
      node.textContent = String(frozenAt);
      return;
    }

    let raf = 0;
    const tick = () => {
      node.textContent = String(Date.now());
      raf = window.requestAnimationFrame(tick);
    };
    tick();
    return () => window.cancelAnimationFrame(raf);
  }, [frozenAt]);

  return (
    <div className="shirt">
      <div className="shirt-frame">
        <svg
          className="shirt-svg"
          viewBox="0 0 100 125"
          role="img"
          aria-label={`${STYLES[style].label} black t-shirt printed with the current datetime`}
        >
          <path fillRule="evenodd" clipRule="evenodd" d={PATHS[style]} />
        </svg>
        <div
          className="shirt-stamp"
          ref={stampRef}
          data-frozen={frozenAt ? 'true' : 'false'}
          suppressHydrationWarning
        >
          {frozenAt ?? ' '}
        </div>
        {showPrice ? (
          <div className="shirt-price">
            <span className="tag">
              <s>{formatUsd(LIST_PRICE_CENTS)}</s> {formatUsd(PRICE_CENTS)}
            </span>
          </div>
        ) : null}
      </div>
      {showCaption ? (
        <p className="shirt-caption">
          <strong>{STYLES[style].garment}</strong>, black, direct-to-garment print.
          The number is Unix epoch milliseconds, captured the instant you confirm
          payment — so no two shirts are the same. Free worldwide shipping.
        </p>
      ) : null}
    </div>
  );
}
