'use client';

import { useEffect, useRef } from 'react';
import { renderSeedArt } from '@/lib/art';
import type { Palette } from '@/lib/catalogue';

export default function SeedCanvas({
  word,
  palette,
  darkGarment,
  width = 900,
  height = 1130,
  caption = true,
  className,
  style,
}: {
  word: string;
  palette: Palette;
  darkGarment: boolean;
  width?: number;
  height?: number;
  caption?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    renderSeedArt(ctx, {
      word,
      palette,
      darkGarment,
      width,
      height,
      caption,
      captionFont: '"IBM Plex Mono", monospace',
    });
  }, [word, palette, darkGarment, width, height, caption]);

  return (
    <canvas
      ref={ref}
      width={width}
      height={height}
      className={className}
      style={{ width: '100%', height: 'auto', display: 'block', ...style }}
    />
  );
}
