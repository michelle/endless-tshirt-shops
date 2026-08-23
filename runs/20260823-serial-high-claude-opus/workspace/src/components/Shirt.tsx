'use client';

import { useEffect, useRef, useState } from 'react';

import { PRINT, type ShirtStyle } from '@/lib/catalog';

/**
 * The product. Silhouettes are the original store's two SVG paths (fitted and
 * unisex); the timestamp lives inside the SVG so it scales with the garment
 * instead of being positioned on top of it in percentages.
 */

const PATHS: Record<ShirtStyle, string> = {
  fitted:
    'M79.312,15.149c-1.629-1.631-16.117-6.146-16.117-6.146s-4.31,8.721-11.66,8.721s-11.66-8.721-11.66-8.721   s-15.354,4.936-16.486,6.068c-1.13,1.13-13.712,16.992-13.712,16.992l10.081,8.37l6.614-5.518c0,0,14.411,23.971,1.384,58.875   c0,0,43.546,10.767,47.434,0c-9.689-43.26,1.379-58.613,1.379-58.613l6.267,5.228l9.35-11.117   C92.185,29.288,80.945,16.781,79.312,15.149z',
  unisex:
    'M79.313,6.142C77.683,4.511,63.196,4,63.196,4s-9.844,13.724-11.661,13.724   C49.719,17.724,39.875,4,39.875,4S24.521,4.932,23.389,6.064c-1.13,1.13-22.827,24.89-22.827,24.89L16.71,42.975l9.662-8.06   l1.384,58.875c0,0,43.541,10.705,47.433,0l1.379-58.613l9.347,7.797L100,30.953C100,30.953,80.945,7.774,79.313,6.142z',
};

/**
 * Print geometry, in the SVG's 100-unit-wide coordinate space. A tee is roughly
 * 20 inches across the chest, so one inch is about five units — which makes the
 * 8 inch print 40 units wide. `textLength` pins it there exactly, so what you
 * see really is the print size.
 */
const PRINT_WIDTH_UNITS = PRINT.widthInches * 5;
const PRINT_BASELINE: Record<ShirtStyle, number> = { fitted: 36, unisex: 34 };

/**
 * Returns the timestamp to display, or `null` before the first client render.
 * Starting at `null` is deliberate: the server has no idea what time it will be
 * when the page is opened, so it renders no digits at all rather than baking in
 * a stale number (and tripping a hydration mismatch on every visit).
 */
export function useTicker(frozenAt: number | null): number | null {
  const [now, setNow] = useState<number | null>(frozenAt);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (frozenAt !== null) {
      setNow(frozenAt);
      return;
    }
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      setNow(Date.now());
      frameRef.current = window.requestAnimationFrame(tick);
    };
    frameRef.current = window.requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, [frozenAt]);

  return frozenAt ?? now;
}

export function Shirt({
  style,
  timestampMs,
  className,
}: {
  style: ShirtStyle;
  timestampMs: number | null;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 105"
      className={className}
      role="img"
      aria-label={
        timestampMs === null
          ? `A black ${style} t-shirt`
          : `A black ${style} t-shirt printed with the timestamp ${timestampMs}`
      }
    >
      <defs>
        {/* A soft vertical shade keeps the black shirt from reading as a flat blob. */}
        <linearGradient id="shirt-cloth" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a2a2c" />
          <stop offset="45%" stopColor="#141416" />
          <stop offset="100%" stopColor="#0a0a0b" />
        </linearGradient>
      </defs>

      <g>
        <path
          d={PATHS[style]}
          fill="url(#shirt-cloth)"
          fillRule="evenodd"
          clipRule="evenodd"
          stroke="#000"
          strokeWidth="0.3"
        />
        {timestampMs === null ? null : (
          <text
            x="50"
            y={PRINT_BASELINE[style]}
            textLength={PRINT_WIDTH_UNITS}
            lengthAdjust="spacing"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="5.1"
            fontWeight={700}
            style={{ fontFamily: 'var(--font-chivo)', fontVariantNumeric: 'tabular-nums' }}
          >
            {timestampMs}
          </text>
        )}
      </g>
    </svg>
  );
}
