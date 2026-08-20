'use client';

import { useEffect, useRef, useState } from 'react';
import type { Style } from '@/lib/catalog';
import { LIST_PRICE_CENTS, PRICE_CENTS, formatUsd } from '@/lib/catalog';

/** Garment outlines, carried over from the original store. */
const PATHS: Record<Style, string> = {
  fitted:
    'M79.312,15.149c-1.629-1.631-16.117-6.146-16.117-6.146s-4.31,8.721-11.66,8.721s-11.66-8.721-11.66-8.721   s-15.354,4.936-16.486,6.068c-1.13,1.13-13.712,16.992-13.712,16.992l10.081,8.37l6.614-5.518c0,0,14.411,23.971,1.384,58.875   c0,0,43.546,10.767,47.434,0c-9.689-43.26,1.379-58.613,1.379-58.613l6.267,5.228l9.35-11.117   C92.185,29.288,80.945,16.781,79.312,15.149z',
  unisex:
    'M79.313,6.142C77.683,4.511,63.196,4,63.196,4s-9.844,13.724-11.661,13.724   C49.719,17.724,39.875,4,39.875,4S24.521,4.932,23.389,6.064c-1.13,1.13-22.827,24.89-22.827,24.89L16.71,42.975l9.662-8.06   l1.384,58.875c0,0,43.541,10.705,47.433,0l1.379-58.613l9.347,7.797L100,30.953C100,30.953,80.945,7.774,79.313,6.142z',
};

/**
 * Baseline of the printed datetime, in viewBox units. The unisex cut has a
 * higher shoulder line, so its chest panel starts a little further up.
 */
const PRINT_Y: Record<Style, number> = {
  fitted: 52,
  unisex: 49,
};

interface ShirtProps {
  style: Style;
  /** When frozen, the shirt shows the exact instant that will be printed. */
  frozenAt: number | null;
}

export default function Shirt({ style, frozenAt }: ShirtProps) {
  const [live, setLive] = useState(false);
  const mainRef = useRef<SVGTextElement>(null);
  const subRef = useRef<SVGTextElement>(null);

  useEffect(() => {
    // Frozen: paint the captured instant once and stop the clock.
    if (frozenAt !== null) {
      if (mainRef.current) mainRef.current.textContent = String(frozenAt);
      setLive(true);
      if (subRef.current) subRef.current.textContent = subtitleFor(frozenAt);
      return;
    }

    let raf = 0;
    const tick = () => {
      const now = Date.now();
      if (mainRef.current) mainRef.current.textContent = String(now);
      if (subRef.current) subRef.current.textContent = subtitleFor(now);
      raf = window.requestAnimationFrame(tick);
    };
    tick();
    setLive(true);
    return () => window.cancelAnimationFrame(raf);
  }, [frozenAt]);

  return (
    <div className={`shirt${frozenAt !== null ? ' is-frozen' : ''}${live ? ' is-live' : ''}`}>
      <svg
        className="shirt-svg"
        viewBox="0 0 100 102"
        role="img"
        aria-label={`A black ${style} t-shirt printed with the current datetime in milliseconds since the Unix epoch`}
      >
        <path
          className="shirt-body"
          fillRule="evenodd"
          clipRule="evenodd"
          d={PATHS[style]}
        />
        {/*
          textLength pins the print to the chest panel, so a 13-digit epoch can
          never spill past the seams regardless of which font actually loads.
        */}
        <text
          ref={mainRef}
          className="shirt-print shirt-print-main"
          x="51"
          y={PRINT_Y[style]}
          textLength="40"
          lengthAdjust="spacingAndGlyphs"
        >
          {'0'.repeat(13)}
        </text>
        <text
          ref={subRef}
          className="shirt-print shirt-print-sub"
          x="51"
          y={PRINT_Y[style] + 5.5}
          textLength="34"
          lengthAdjust="spacingAndGlyphs"
        >
          {'0'.repeat(24)}
        </text>
      </svg>

      <div className="shirt-caption">
        <span className="price-tag">
          <s>{formatUsd(LIST_PRICE_CENTS)}</s>
          {formatUsd(PRICE_CENTS)}
        </span>
        {frozenAt !== null ? (
          <span className="shirt-frozen-note">
            Locked in — this exact millisecond goes to print.
          </span>
        ) : (
          <span className="shirt-note">
            Milliseconds since the Unix epoch, printed the moment you buy.
          </span>
        )}
      </div>
    </div>
  );
}

/** Human-readable UTC gloss printed under the epoch millis. */
function subtitleFor(ms: number): string {
  return `${new Date(ms).toISOString().replace('T', '  ').replace('Z', '')} UTC`;
}

/* ------------------------------------------------------------------------ */

/** Print geometry: 8in x 2.4in at 300dpi. */
const PRINT_WIDTH_PX = 2400;
const PRINT_HEIGHT_PX = 720;

/**
 * Render the artwork that actually gets printed, at press resolution.
 *
 * The on-screen shirt is SVG (crisp at any size) but Scalable Press wants a
 * raster PNG, so this draws the same composition onto an offscreen canvas at
 * 300dpi rather than upscaling the preview.
 */
export async function renderPrintArtwork(capturedAt: number): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = PRINT_WIDTH_PX;
  canvas.height = PRINT_HEIGHT_PX;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create a canvas for the artwork.');

  // Make sure Chivo is actually available before measuring or drawing.
  await ensureFont();

  // Transparent background: DTG prints only the inked pixels.
  ctx.clearRect(0, 0, PRINT_WIDTH_PX, PRINT_HEIGHT_PX);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const main = String(capturedAt);
  const sub = subtitleFor(capturedAt);
  const centerX = PRINT_WIDTH_PX / 2;

  // Scale the headline to fill the print width with a small margin.
  let fontSize = 420;
  ctx.font = `700 ${fontSize}px Chivo, Helvetica, sans-serif`;
  const maxWidth = PRINT_WIDTH_PX * 0.94;
  const measured = ctx.measureText(main).width;
  if (measured > maxWidth) {
    fontSize = Math.floor(fontSize * (maxWidth / measured));
    ctx.font = `700 ${fontSize}px Chivo, Helvetica, sans-serif`;
  }
  ctx.fillText(main, centerX, PRINT_HEIGHT_PX * 0.38, maxWidth);

  ctx.font = `400 ${Math.round(fontSize * 0.16)}px Chivo, Helvetica, sans-serif`;
  ctx.globalAlpha = 0.85;
  ctx.fillText(sub, centerX, PRINT_HEIGHT_PX * 0.78, maxWidth);
  ctx.globalAlpha = 1;

  return canvas.toDataURL('image/png');
}

async function ensureFont(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('700 420px Chivo'),
        document.fonts.load('400 68px Chivo'),
      ]),
      // Never block checkout on a font CDN.
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ]);
  } catch {
    // Fall back to Helvetica; the print is still legible.
  }
}
