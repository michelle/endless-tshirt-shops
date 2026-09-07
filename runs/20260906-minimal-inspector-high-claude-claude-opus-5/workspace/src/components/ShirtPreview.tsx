'use client';

import { useCallback, useEffect, useRef } from 'react';
import { LIST_PRICE_CENTS, PRICE_CENTS, formatUsd, type ShirtStyle } from '@/lib/product';

/**
 * Tee silhouettes carried over from the original store, drawn in a 100x125
 * viewBox. The stamp is placed to mirror the real print: an 8"-wide line, 3"
 * down a 15.6" x 19.3" print area, so what you see is what gets printed.
 */
const SHIRT_PATHS: Record<ShirtStyle, string> = {
  fitted:
    'M79.312,15.149c-1.629-1.631-16.117-6.146-16.117-6.146s-4.31,8.721-11.66,8.721s-11.66-8.721-11.66-8.721 s-15.354,4.936-16.486,6.068c-1.13,1.13-13.712,16.992-13.712,16.992l10.081,8.37l6.614-5.518c0,0,14.411,23.971,1.384,58.875 c0,0,43.546,10.767,47.434,0c-9.689-43.26,1.379-58.613,1.379-58.613l6.267,5.228l9.35-11.117 C92.185,29.288,80.945,16.781,79.312,15.149z',
  unisex:
    'M79.313,6.142C77.683,4.511,63.196,4,63.196,4s-9.844,13.724-11.661,13.724 C49.719,17.724,39.875,4,39.875,4S24.521,4.932,23.389,6.064c-1.13,1.13-22.827,24.89-22.827,24.89L16.71,42.975l9.662-8.06 l1.384,58.875c0,0,43.541,10.705,47.433,0l1.379-58.613l9.347,7.797L100,30.953C100,30.953,80.945,7.774,79.313,6.142z',
};

const STAMP = {
  baselineY: 42,
  fontSize: 3.8,
  textLength: 28.7,
};

const PLACEHOLDER = '0000000000000';

type Props = {
  style: ShirtStyle;
  frozenAt: number | null;
};

export default function ShirtPreview({ style, frozenAt }: Props) {
  const stampRef = useRef<SVGTextElement>(null);
  const readoutRef = useRef<HTMLDivElement>(null);

  const apply = useCallback((value: string) => {
    if (stampRef.current) stampRef.current.textContent = value;
    if (readoutRef.current) readoutRef.current.textContent = value;
  }, []);

  useEffect(() => {
    if (frozenAt !== null) {
      apply(String(frozenAt));
      return;
    }
    let frame = 0;
    const loop = () => {
      apply(String(Date.now()));
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [frozenAt, apply]);

  return (
    <div className="shirt-panel">
      <div className="shirt">
        <svg
          className="shirt-svg"
          viewBox="0 0 100 104"
          role="img"
          aria-label={`A black ${style} t-shirt printed with a millisecond timestamp`}
        >
          <path className="shirt-body" fillRule="evenodd" clipRule="evenodd" d={SHIRT_PATHS[style]} />
          <text
            ref={stampRef}
            className="shirt-stamp"
            x="50"
            y={STAMP.baselineY}
            fontSize={STAMP.fontSize}
            textLength={STAMP.textLength}
            lengthAdjust="spacingAndGlyphs"
            textAnchor="middle"
            suppressHydrationWarning
          >
            {frozenAt ?? PLACEHOLDER}
          </text>
        </svg>
        <div className="price">
          <s>{formatUsd(LIST_PRICE_CENTS)}</s>
          <span>{formatUsd(PRICE_CENTS)}</span>
        </div>
      </div>

      <div className="readout">
        <span className="readout-label">
          <span className={`dot ${frozenAt === null ? 'live' : 'frozen'}`} />
          {frozenAt === null ? 'your shirt will say' : 'your shirt says'}
        </span>
        <div className="readout-value" ref={readoutRef} suppressHydrationWarning>
          {frozenAt ?? PLACEHOLDER}
        </div>
        <span className="readout-note">
          {frozenAt === null
            ? 'Milliseconds since 1 January 1970. It stops the instant you hit buy — that is the one you get.'
            : 'Locked in. This exact millisecond goes to the printer.'}
        </span>
      </div>
    </div>
  );
}
