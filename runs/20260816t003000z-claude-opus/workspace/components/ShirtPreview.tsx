'use client';

import { useEffect, useRef } from 'react';
import { COMPARE_AT_CENTS, formatUsd, PRICE_CENTS, STYLES, type Style } from '@/lib/catalog';

const STYLE_NAMES: Record<Style, string> = {
  fitted: STYLES.fitted.label.toLowerCase(),
  unisex: STYLES.unisex.label.toLowerCase(),
};

/** Garment silhouettes, carried over verbatim from the original store. */
const PATHS: Record<Style, string> = {
  fitted:
    'M79.312,15.149c-1.629-1.631-16.117-6.146-16.117-6.146s-4.31,8.721-11.66,8.721s-11.66-8.721-11.66-8.721   s-15.354,4.936-16.486,6.068c-1.13,1.13-13.712,16.992-13.712,16.992l10.081,8.37l6.614-5.518c0,0,14.411,23.971,1.384,58.875   c0,0,43.546,10.767,47.434,0c-9.689-43.26,1.379-58.613,1.379-58.613l6.267,5.228l9.35-11.117   C92.185,29.288,80.945,16.781,79.312,15.149z',
  unisex:
    'M79.313,6.142C77.683,4.511,63.196,4,63.196,4s-9.844,13.724-11.661,13.724   C49.719,17.724,39.875,4,39.875,4S24.521,4.932,23.389,6.064c-1.13,1.13-22.827,24.89-22.827,24.89L16.71,42.975l9.662-8.06   l1.384,58.875c0,0,43.541,10.705,47.433,0l1.379-58.613l9.347,7.797L100,30.953C100,30.953,80.945,7.774,79.313,6.142z',
};

interface Props {
  style: Style;
  /** When set, the shirt shows this exact instant instead of ticking. */
  frozenAt: number | null;
}

export default function ShirtPreview({ style, frozenAt }: Props) {
  const stampRef = useRef<HTMLDivElement>(null);

  // The ticker writes straight to the DOM node rather than through state: at
  // frame rate, a React re-render per millisecond is pure waste. The timestamp
  // is also client-only, since a server-rendered one would be stale on arrival.
  useEffect(() => {
    const node = stampRef.current;
    if (!node) return;

    if (frozenAt !== null) {
      node.textContent = String(frozenAt);
      return;
    }

    let raf = 0;
    const tick = () => {
      node.textContent = String(Date.now());
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [frozenAt]);

  return (
    <div>
      <div className="shirt">
        <svg
          className="shirt-svg"
          viewBox="0 0 100 102"
          role="img"
          aria-label={`Black ${STYLE_NAMES[style]} t-shirt printed with the current timestamp`}
        >
          <path fillRule="evenodd" clipRule="evenodd" d={PATHS[style]} />
        </svg>

        <div className="shirt-print">
          {/* A zero-width space holds the line's height before the first tick. */}
          <div className="shirt-stamp" ref={stampRef} aria-hidden="true">
            &#8203;
          </div>
        </div>

        <div className="shirt-price">
          <span className="tag">
            <s>{formatUsd(COMPARE_AT_CENTS)}</s>
            {formatUsd(PRICE_CENTS)}
          </span>
        </div>
      </div>

      <p className="shirt-caption">
        {frozenAt === null ? (
          <>
            Milliseconds since the Unix epoch, ticking live. <strong>Buy now</strong> freezes the
            number and that is what gets printed.
          </>
        ) : (
          <>
            Printing <strong>{frozenAt}</strong> — yours alone, forever.
          </>
        )}
      </p>
    </div>
  );
}
