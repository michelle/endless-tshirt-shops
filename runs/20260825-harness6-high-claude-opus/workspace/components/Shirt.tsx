'use client';

import { useEffect, useRef } from 'react';

import { DIGITS, PREVIEW } from '@/lib/artwork';
import { LIST_PRICE_CENTS, PRICE_CENTS, formatMoney, type StyleId } from '@/lib/product';

const PATHS: Record<StyleId, string> = {
  fitted:
    'M79.312,15.149c-1.629-1.631-16.117-6.146-16.117-6.146s-4.31,8.721-11.66,8.721s-11.66-8.721-11.66-8.721   s-15.354,4.936-16.486,6.068c-1.13,1.13-13.712,16.992-13.712,16.992l10.081,8.37l6.614-5.518c0,0,14.411,23.971,1.384,58.875   c0,0,43.546,10.767,47.434,0c-9.689-43.26,1.379-58.613,1.379-58.613l6.267,5.228l9.35-11.117   C92.185,29.288,80.945,16.781,79.312,15.149z',
  unisex:
    'M79.313,6.142C77.683,4.511,63.196,4,63.196,4s-9.844,13.724-11.661,13.724   C49.719,17.724,39.875,4,39.875,4S24.521,4.932,23.389,6.064c-1.13,1.13-22.827,24.89-22.827,24.89L16.71,42.975l9.662-8.06   l1.384,58.875c0,0,43.541,10.705,47.433,0l1.379-58.613l9.347,7.797L100,30.953C100,30.953,80.945,7.774,79.313,6.142z',
};

const SLOTS = Array.from({ length: DIGITS }, (_, i) => i);

type Props = {
  style: StyleId;
  /** Server-rendered starting value, so the shirt is never blank. */
  initialMs: number;
  /** Once set, the clock stops: this is the number being bought. */
  lockedMs: number | null;
  showPrice?: boolean;
};

export function Shirt({ style, initialMs, lockedMs, showPrice = true }: Props) {
  const slots = useRef<(SVGTextElement | null)[]>([]);

  useEffect(() => {
    const paint = (value: number) => {
      const digits = String(value);
      for (let i = 0; i < DIGITS; i += 1) {
        const node = slots.current[i];
        const digit = digits[i] ?? '0';
        // Touch the DOM only for the digits that actually changed.
        if (node && node.textContent !== digit) node.textContent = digit;
      }
    };

    if (lockedMs !== null) {
      paint(lockedMs);
      return;
    }

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const minGap = reduced ? 250 : 0;

    let frame = 0;
    let last = 0;
    const tick = () => {
      const now = Date.now();
      if (now - last >= minGap) {
        paint(now);
        last = now;
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [lockedMs]);

  const shown = String(lockedMs ?? initialMs).padStart(DIGITS, '0');

  return (
    <div className="shirt" data-locked={lockedMs !== null}>
      <svg
        viewBox="0 0 100 125"
        role="img"
        aria-label={`A ${style} black t-shirt printed with the number ${lockedMs ?? initialMs}`}
      >
        <path className="shirt-body" fillRule="evenodd" clipRule="evenodd" d={PATHS[style]} />
        <rect
          className="shirt-printarea"
          x={PREVIEW.printX}
          y={PREVIEW.printY}
          width={PREVIEW.printW}
          height={PREVIEW.printH}
        />
        <g className="shirt-digit" fontSize={PREVIEW.fontSize} aria-hidden="true">
          {SLOTS.map((index) => (
            <text
              key={index}
              ref={(node) => {
                slots.current[index] = node;
              }}
              x={50 + (index - (DIGITS - 1) / 2) * PREVIEW.advance}
              y={PREVIEW.baseline}
              textAnchor="middle"
            >
              {shown[index]}
            </text>
          ))}
        </g>
      </svg>

      {showPrice ? (
        <div className="pricetag">
          <s>{formatMoney(LIST_PRICE_CENTS)}</s>
          <strong>{formatMoney(PRICE_CENTS)}</strong>
        </div>
      ) : null}
    </div>
  );
}
