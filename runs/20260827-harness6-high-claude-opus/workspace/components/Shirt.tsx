'use client';

import { useEffect, useRef } from 'react';

import { LIST_PRICE_CENTS, PRICE_CENTS, formatUsd, type Style } from '@/lib/catalog';

/**
 * The silhouettes are lifted from the original shop — they are the product's
 * face and there is no reason to redraw them.
 */
const PATHS: Record<Style, string> = {
  fitted:
    'M79.312,15.149c-1.629-1.631-16.117-6.146-16.117-6.146s-4.31,8.721-11.66,8.721s-11.66-8.721-11.66-8.721   s-15.354,4.936-16.486,6.068c-1.13,1.13-13.712,16.992-13.712,16.992l10.081,8.37l6.614-5.518c0,0,14.411,23.971,1.384,58.875   c0,0,43.546,10.767,47.434,0c-9.689-43.26,1.379-58.613,1.379-58.613l6.267,5.228l9.35-11.117   C92.185,29.288,80.945,16.781,79.312,15.149z',
  unisex:
    'M79.313,6.142C77.683,4.511,63.196,4,63.196,4s-9.844,13.724-11.661,13.724   C49.719,17.724,39.875,4,39.875,4S24.521,4.932,23.389,6.064c-1.13,1.13-22.827,24.89-22.827,24.89L16.71,42.975l9.662-8.06   l1.384,58.875c0,0,43.541,10.705,47.433,0l1.379-58.613l9.347,7.797L100,30.953C100,30.953,80.945,7.774,79.313,6.142z',
};

type Props = {
  style: Style;
  /** When set, the clock stops here — this is the millisecond being bought. */
  frozenTs: number | null;
};

export default function Shirt({ style, frozenTs }: Props) {
  const digitsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = digitsRef.current;
    if (!node) return;

    if (frozenTs !== null) {
      node.textContent = String(frozenTs);
      return;
    }

    // Written straight to the DOM on every frame rather than through state: this
    // ticks at ~60fps and React has no business re-rendering that often.
    let raf = 0;
    const tick = () => {
      node.textContent = String(Date.now());
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [frozenTs]);

  return (
    <div className="shirt">
      <div className="shirt-stage">
        <svg
          className="shirt-svg"
          viewBox="0 0 100 105"
          role="img"
          aria-label={`Black ${style} t-shirt printed with the current Unix timestamp in milliseconds`}
        >
          <path fillRule="evenodd" clipRule="evenodd" d={PATHS[style]} />
        </svg>

        <div className={`shirt-print${frozenTs !== null ? ' is-frozen' : ''}`}>
          <div className="digits" ref={digitsRef} suppressHydrationWarning>
            {frozenTs ?? ' '}
          </div>
        </div>

        <div className="shirt-price">
          <s>{formatUsd(LIST_PRICE_CENTS)}</s>
          <span>{formatUsd(PRICE_CENTS)}</span>
        </div>
      </div>

      <p className="shirt-caption">
        {frozenTs !== null
          ? 'Locked. This is the exact millisecond going on your shirt.'
          : 'Milliseconds since 1 January 1970. Yours is whichever one you click on.'}
      </p>
    </div>
  );
}
