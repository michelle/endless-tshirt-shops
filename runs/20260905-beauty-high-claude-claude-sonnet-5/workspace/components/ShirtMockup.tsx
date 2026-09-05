'use client';

import { forwardRef } from 'react';
import type { Fit } from '@/lib/catalog';

// Simplified, stylized t-shirt silhouettes (not garment-tech accurate, but
// readable at a glance and just distinct enough between fits). The live
// artwork canvas is layered on top, clipped to roughly the "front print
// area" of the garment.
const UNISEX_PATH =
  'M62,26 L86,14 Q100,30 114,14 L138,26 L182,58 L154,90 L138,74 L138,208 L62,208 L62,74 L46,90 L18,58 Z';
const FITTED_PATH =
  'M64,26 L86,14 Q100,30 114,14 L136,26 L180,58 L152,90 L136,74 L140,120 Q146,160 138,208 L62,208 Q54,160 60,120 L64,74 L48,90 L20,58 Z';

export const ShirtMockup = forwardRef<
  HTMLCanvasElement,
  {
    fit: Fit;
    swatch: string;
    ink: 'light' | 'dark';
    canvasWidth: number;
    canvasHeight: number;
  }
>(function ShirtMockup({ fit, swatch, ink, canvasWidth, canvasHeight }, ref) {
  const path = fit === 'fitted' ? FITTED_PATH : UNISEX_PATH;
  const stitch = ink === 'light' ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.16)';

  return (
    <div className="relative mx-auto aspect-[200/222] w-full max-w-md drop-shadow-2xl">
      <svg viewBox="0 0 200 222" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="fabric" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={swatch} stopOpacity="1" />
            <stop offset="100%" stopColor={swatch} stopOpacity="0.86" />
          </linearGradient>
          <clipPath id="shirtClip">
            <path d={path} />
          </clipPath>
        </defs>
        <path d={path} fill="url(#fabric)" stroke="rgba(0,0,0,0.25)" strokeWidth="1.5" />
        {/* collar */}
        <path
          d="M86,14 Q100,30 114,14"
          fill="none"
          stroke={stitch}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* sleeve seams */}
        <path d="M46,90 L62,74" stroke={stitch} strokeWidth="1.5" fill="none" strokeDasharray="2 2" />
        <path d="M154,90 L138,74" stroke={stitch} strokeWidth="1.5" fill="none" strokeDasharray="2 2" />
        {/* hem */}
        <path d="M62,205 L138,205" stroke={stitch} strokeWidth="1.5" fill="none" strokeDasharray="2 2" />

        <g clipPath="url(#shirtClip)">
          <foreignObject x="58" y="66" width="84" height="118">
            <div style={{ width: '100%', height: '100%' }}>
              <canvas
                ref={ref}
                width={canvasWidth}
                height={canvasHeight}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: 4,
                  boxShadow: '0 0 0 1px rgba(0,0,0,0.15) inset',
                }}
              />
            </div>
          </foreignObject>
        </g>
      </svg>
    </div>
  );
});
