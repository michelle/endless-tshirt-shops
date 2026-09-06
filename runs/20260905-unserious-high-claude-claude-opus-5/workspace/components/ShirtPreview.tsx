'use client';

import { useEffect, useRef } from 'react';
import { SEGMENT_NAMES, isLit, segmentPath, DIGIT_ADVANCE } from '@/lib/glyphs';
import { placeText } from '@/lib/print-layout';
import type { Colour, Fit } from '@/lib/catalog';

/**
 * The shirt, ticking.
 *
 * The digits are positioned with the same `placeText` helper the print file
 * uses, inside a rectangle that mirrors the real front print area. What you see
 * here is genuinely what gets printed.
 */

/**
 * The garment is drawn to the Gildan 64000's real proportions: 15.6in across
 * the chest by 19.3in long, i.e. a body roughly 1.24x taller than it is wide.
 * Getting this right is what stops the illustration reading as a tunic.
 */
const VIEW_W = 420;
const VIEW_H = 400;

/** Body spans x 86..334 (248 units = 15.6in), shoulders y52 to hem y376. */
const UNITS_PER_INCH = 248 / 15.6;

/**
 * The 13.98in x 17.91in front print area, centred on the body and starting
 * just below the collar. Sizing this rectangle correctly is what makes the
 * preview honest about how large the print actually is.
 */
const PRINT = {
  x: 210 - (13.98 * UNITS_PER_INCH) / 2,
  y: 95,
  w: 13.98 * UNITS_PER_INCH,
  h: 17.91 * UNITS_PER_INCH,
};

/** Timestamps are 13 digits; we allocate exactly that many slots. */
const SLOTS = 13;

/** Garment outlines. Both share a shoulder line so switching fit stays calm. */
const BODY: Record<Fit, string> = {
  classic:
    'M175 52 L118 34 C82 47 47 69 20 93 L46 170 C50 177 59 178 65 173 L86 155 ' +
    'L86 364 C86 371 91 376 98 376 L322 376 C329 376 334 371 334 364 L334 155 ' +
    'L355 173 C361 178 370 177 374 170 L400 93 C373 69 338 47 302 34 L245 52 ' +
    'C236 84 184 84 175 52 Z',
  fitted:
    'M177 52 L124 36 C92 48 62 68 38 90 L60 160 C64 167 72 168 78 163 L96 148 ' +
    'C106 215 107 295 98 364 C98 371 103 376 110 376 L310 376 C317 376 322 371 322 364 ' +
    'C313 295 314 215 324 148 L342 163 C348 168 356 167 360 160 L382 90 ' +
    'C358 68 328 48 296 36 L243 52 C234 82 186 82 177 52 Z',
};

/** Neckline rib, drawn over the body for a bit of garment detail. */
const COLLAR: Record<Fit, string> = {
  classic: 'M175 52 C184 84 236 84 245 52 L252 60 C242 94 178 94 168 60 Z',
  fitted: 'M177 52 C186 82 234 82 243 52 L250 60 C240 92 180 92 170 60 Z',
};

type Props = {
  fit: Fit;
  colour: Colour;
  /** Frozen timestamp (e.g. on a receipt); omit to tick live. */
  frozen?: string;
};

export default function ShirtPreview({ fit, colour, frozen }: Props) {
  const segmentRefs = useRef<(SVGPathElement | null)[][]>([]);

  useEffect(() => {
    const paint = (value: string) => {
      // Right-align into the fixed slots so the digits never shift horizontally.
      const digits = value.padStart(SLOTS, ' ').slice(-SLOTS);
      for (let slot = 0; slot < SLOTS; slot++) {
        const ch = digits[slot];
        const paths = segmentRefs.current[slot];
        if (!paths) continue;
        for (let s = 0; s < SEGMENT_NAMES.length; s++) {
          const el = paths[s];
          if (el) el.style.opacity = isLit(ch, SEGMENT_NAMES[s]) ? '1' : '0';
        }
      }
    };

    if (frozen) {
      paint(frozen);
      return;
    }

    let raf = 0;
    const tick = () => {
      paint(String(Date.now()));
      raf = window.requestAnimationFrame(tick);
    };
    tick();
    return () => window.cancelAnimationFrame(raf);
  }, [frozen]);

  const { scale, offsetX, offsetY } = placeText(SLOTS, PRINT.x, PRINT.y, PRINT.w, PRINT.h);

  return (
    <svg
      className="stage-svg"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      role="img"
      aria-label={`A ${colour.label.toLowerCase()} ${fit} t-shirt printed with the current Unix timestamp in milliseconds`}
    >
      <defs>
        <linearGradient id="fabric" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.10" />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.22" />
        </linearGradient>
      </defs>

      {/* Garment */}
      <path d={BODY[fit]} fill={colour.hex} stroke="rgba(0,0,0,0.35)" strokeWidth="1.5" />
      <path d={BODY[fit]} fill="url(#fabric)" />
      <path d={COLLAR[fit]} fill="rgba(0,0,0,0.20)" />

      {/* The print */}
      <g fill={colour.ink === 'white' ? '#ffffff' : '#101010'}>
        {Array.from({ length: SLOTS }, (_, slot) => (
          <g key={slot} transform={`translate(${offsetX + slot * DIGIT_ADVANCE * scale} ${offsetY}) scale(${scale})`}>
            {SEGMENT_NAMES.map((name, s) => (
              <path
                key={name}
                d={segmentPath(name)}
                opacity={0}
                ref={(el) => {
                  (segmentRefs.current[slot] ??= [])[s] = el;
                }}
              />
            ))}
          </g>
        ))}
      </g>
    </svg>
  );
}
