'use client';

import { useEffect, useRef } from 'react';
import { renderFrontDesign, renderBackMark, StyleKey } from '@/lib/designs';

const VIEWBOX_W = 500;
const VIEWBOX_H = 560;

const FRONT_AREA = { x: 150, y: 175, width: 200, height: 255 };
const BACK_AREA = { x: 195, y: 125, width: 110, height: 150 };

const SHIRT_PATH =
  'M150,60 L40,110 L95,230 L110,520 L390,520 L405,230 L460,110 L350,60 Q250,110 150,60 Z';

function areaStyle(area: typeof FRONT_AREA) {
  return {
    left: `${(area.x / VIEWBOX_W) * 100}%`,
    top: `${(area.y / VIEWBOX_H) * 100}%`,
    width: `${(area.width / VIEWBOX_W) * 100}%`,
    height: `${(area.height / VIEWBOX_H) * 100}%`,
  };
}

export function ShirtMockup({
  garmentHex,
  seedText,
  style,
  colors,
  view,
}: {
  garmentHex: string;
  seedText: string;
  style: StyleKey;
  colors: string[];
  view: 'front' | 'back';
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const area = view === 'front' ? FRONT_AREA : BACK_AREA;
  const aspect = area.height / area.width;
  const canvasWidth = 480;
  const canvasHeight = Math.round(canvasWidth * aspect);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const opts = {
      width: canvas.width,
      height: canvas.height,
      seedText: seedText || 'seed',
      style,
      colors,
    };
    if (view === 'front') renderFrontDesign(ctx, opts);
    else renderBackMark(ctx, opts);
  }, [seedText, style, colors, view]);

  const pos = areaStyle(area);

  return (
    <div className="relative w-full max-w-sm mx-auto aspect-[500/560]">
      <svg
        viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
        className="absolute inset-0 w-full h-full drop-shadow-2xl"
      >
        <path
          d={SHIRT_PATH}
          fill={garmentHex}
          stroke="rgba(0,0,0,0.28)"
          strokeWidth={3}
        />
        <path
          d="M198,72 Q250,105 302,72"
          fill="none"
          stroke="rgba(0,0,0,0.22)"
          strokeWidth={4}
        />
      </svg>
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="absolute"
        style={pos}
      />
    </div>
  );
}
