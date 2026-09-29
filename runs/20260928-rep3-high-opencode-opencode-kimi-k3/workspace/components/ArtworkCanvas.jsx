'use client';

// Live star-map artwork preview. Uses the exact renderer that produces the
// print file server-side, so what you see is what gets printed.
import { useEffect, useRef, useState } from 'react';
import { renderArtwork, PRINT_ASPECT, FONT_SERIF, FONT_SERIF_BOLD, FONT_SERIF_ITALIC } from '../lib/render';

let fontPromise = null;
function ensureFonts() {
  if (fontPromise) return fontPromise;
  const defs = [
    [FONT_SERIF, '/fonts/CormorantGaramond-Medium.otf'],
    [FONT_SERIF_BOLD, '/fonts/CormorantGaramond-SemiBold.otf'],
    [FONT_SERIF_ITALIC, '/fonts/CormorantGaramond-MediumItalic.otf'],
  ];
  fontPromise = Promise.all(
    defs.map(([family, url]) => {
      const face = new FontFace(family, `url(${url})`);
      return face.load().then((f) => document.fonts.add(f));
    })
  ).catch(() => {});
  return fontPromise;
}

export default function ArtworkCanvas({ design, width = 720, className }) {
  const ref = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let live = true;
    ensureFonts().then(() => live && setReady(true));
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (!ready || !ref.current || !design) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.round(width * dpr);
    const H = Math.round(W * PRINT_ASPECT);
    const canvas = ref.current;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    renderArtwork(ctx, W, H, design);
  }, [ready, design, width]);

  return (
    <canvas
      ref={ref}
      className={className}
      style={{ width: '100%', height: 'auto', opacity: ready ? 1 : 0.25, transition: 'opacity .35s ease' }}
      aria-label="Star map artwork preview"
    />
  );
}
