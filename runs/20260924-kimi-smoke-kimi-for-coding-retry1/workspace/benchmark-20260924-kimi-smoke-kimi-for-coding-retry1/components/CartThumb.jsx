'use client';

import { useEffect, useRef } from 'react';
import { drawPreview } from '@/lib/renderCanvas';

// Small client-rendered thumbnail of the artwork (no tee), used in cart lines.
export default function CartThumb({ design, w = 184 }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const h = Math.round((w * 900) / 780);
    canvas.width = w;
    canvas.height = h;
    try {
      drawPreview(canvas, design, { artOnly: true });
    } catch (e) {
      console.error(e);
    }
  }, [design, w]);
  return <canvas ref={ref} style={{ width: 92, borderRadius: 8, background: '#0d1226' }} />;
}
