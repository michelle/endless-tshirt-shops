'use client';

import { useEffect, useRef } from 'react';
import { ARTWORK_ASPECT, drawArtwork } from '@/lib/artwork';
import { LIST_PRICE_CENTS, PRICE_CENTS, formatUsd, type ShirtStyle } from '@/lib/products';

const PATHS: Record<ShirtStyle, string> = {
  fitted:
    'M79.312,15.149c-1.629-1.631-16.117-6.146-16.117-6.146s-4.31,8.721-11.66,8.721s-11.66-8.721-11.66-8.721   s-15.354,4.936-16.486,6.068c-1.13,1.13-13.712,16.992-13.712,16.992l10.081,8.37l6.614-5.518c0,0,14.411,23.971,1.384,58.875   c0,0,43.546,10.767,47.434,0c-9.689-43.26,1.379-58.613,1.379-58.613l6.267,5.228l9.35-11.117   C92.185,29.288,80.945,16.781,79.312,15.149z',
  unisex:
    'M79.313,6.142C77.683,4.511,63.196,4,63.196,4s-9.844,13.724-11.661,13.724   C49.719,17.724,39.875,4,39.875,4S24.521,4.932,23.389,6.064c-1.13,1.13-22.827,24.89-22.827,24.89L16.71,42.975l9.662-8.06   l1.384,58.875c0,0,43.541,10.705,47.433,0l1.379-58.613l9.347,7.797L100,30.953C100,30.953,80.945,7.774,79.313,6.142z',
};

/** Preview resolution. Bumped by DPR so the timestamp stays crisp. */
const PREVIEW_WIDTH = 900;

type Props = {
  style: ShirtStyle;
  /** When set, the shirt stops ticking and displays this exact moment. */
  frozenTs: number | null;
};

export default function Shirt({ style, frozenTs }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frozenRef = useRef(frozenTs);
  frozenRef.current = frozenTs;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 3);
    const width = Math.round(PREVIEW_WIDTH * dpr);
    canvas.width = width;
    canvas.height = Math.round(width / ARTWORK_ASPECT);

    let raf = 0;
    let cancelled = false;
    let last = -1;

    const tick = () => {
      if (cancelled) return;
      const ts = frozenRef.current ?? Date.now();
      if (ts !== last) {
        last = ts;
        drawArtwork(ctx, width, ts);
      }
      raf = window.requestAnimationFrame(tick);
    };

    // Wait for Chivo before the first paint, otherwise the fallback metrics
    // would size the text wrong for a frame.
    const start = () => {
      if (cancelled) return;
      tick();
    };
    if (typeof document !== 'undefined' && document.fonts) {
      document.fonts.load('500 100px Chivo').then(start, start);
    } else {
      start();
    }

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="Shirt">
      <div className="Shirt-print">
        <canvas ref={canvasRef} aria-hidden="true" />
      </div>
      <svg
        className="Shirt-svg"
        viewBox="0 0 100 100"
        role="img"
        aria-label={`A black ${style} t-shirt printed with the current time in milliseconds`}
      >
        <path fillRule="evenodd" clipRule="evenodd" d={PATHS[style]} />
      </svg>
      <div className="Shirt-price">
        <span className="tag">
          <s>{formatUsd(LIST_PRICE_CENTS)}</s> {formatUsd(PRICE_CENTS)}
        </span>
      </div>
    </div>
  );
}
