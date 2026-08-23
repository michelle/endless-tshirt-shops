'use client';

import { useEffect, useRef } from 'react';
import { LIST_PRICE_CENTS, PRICE_CENTS, formatUsd, type ShirtStyle } from '@/lib/catalog';
import { drawPreview } from '@/lib/artwork';

/**
 * The two garment silhouettes, kept verbatim from the original store — the
 * fitted cut has a scooped neck and set-in sleeves, the unisex one a wide crew
 * neck and dropped shoulders.
 */
const SHIRT_PATHS: Record<ShirtStyle, string> = {
  fitted:
    'M79.312,15.149c-1.629-1.631-16.117-6.146-16.117-6.146s-4.31,8.721-11.66,8.721s-11.66-8.721-11.66-8.721   s-15.354,4.936-16.486,6.068c-1.13,1.13-13.712,16.992-13.712,16.992l10.081,8.37l6.614-5.518c0,0,14.411,23.971,1.384,58.875   c0,0,43.546,10.767,47.434,0c-9.689-43.26,1.379-58.613,1.379-58.613l6.267,5.228l9.35-11.117   C92.185,29.288,80.945,16.781,79.312,15.149z',
  unisex:
    'M79.313,6.142C77.683,4.511,63.196,4,63.196,4s-9.844,13.724-11.661,13.724   C49.719,17.724,39.875,4,39.875,4S24.521,4.932,23.389,6.064c-1.13,1.13-22.827,24.89-22.827,24.89L16.71,42.975l9.662-8.06   l1.384,58.875c0,0,43.541,10.705,47.433,0l1.379-58.613l9.347,7.797L100,30.953C100,30.953,80.945,7.774,79.313,6.142z',
};

type Props = {
  style: ShirtStyle;
  /** When set, the preview stops ticking and shows this moment forever. */
  frozenAt: number | null;
  font: string;
};

export function Shirt({ style, frozenAt, font }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chestRef = useRef<HTMLDivElement>(null);
  const frozenRef = useRef(frozenAt);
  frozenRef.current = frozenAt;

  useEffect(() => {
    const canvas = canvasRef.current;
    const chest = chestRef.current;
    if (!canvas || !chest) return;

    let raf = 0;
    let lastDrawn = -1;
    let lastWidth = -1;

    const tick = () => {
      const width = chest.clientWidth;
      const value = frozenRef.current ?? Date.now();
      // Only touch the canvas when something actually changed. At 120Hz this
      // skips most frames, since the value only moves every millisecond.
      if (value !== lastDrawn || width !== lastWidth) {
        if (width > 0) drawPreview(canvas, value, font, width);
        lastDrawn = value;
        lastWidth = width;
      }
      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [font]);

  return (
    <div className="shirt">
      <svg
        className="shirt-svg"
        viewBox="0 0 100 125"
        width="100%"
        role="img"
        aria-label={`A black ${style} t-shirt printed with the current Unix timestamp in milliseconds`}
      >
        <defs>
          <linearGradient id="shirt-fabric" x1="0" y1="0" x2="0.35" y2="1">
            <stop offset="0%" stopColor="#232323" />
            <stop offset="55%" stopColor="#111111" />
            <stop offset="100%" stopColor="#050505" />
          </linearGradient>
        </defs>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          fill="url(#shirt-fabric)"
          d={SHIRT_PATHS[style]}
        />
      </svg>

      <div className="shirt-chest" ref={chestRef} aria-hidden="true">
        <canvas ref={canvasRef} className="shirt-canvas" />
      </div>

      <p className="shirt-live" aria-live="off">
        {frozenAt === null ? (
          <>
            <span className="shirt-live-dot" /> ticking — the moment you buy is the moment
            you get
          </>
        ) : (
          <>locked at {frozenAt} — that is your shirt</>
        )}
      </p>

      <div className="shirt-price">
        <span className="shirt-price-was">{formatUsd(LIST_PRICE_CENTS)}</span>
        <span className="shirt-price-now">{formatUsd(PRICE_CENTS)}</span>
      </div>
    </div>
  );
}
