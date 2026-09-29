'use client';

// Ambient animated starfield for the hero.
import { useEffect, useRef } from 'react';

export default function StarfieldCanvas({ density = 0.00018 }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    let w, h, stars, raf;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    const seed = (n) => () => (n = (n * 16807) % 2147483647) / 2147483647;
    const rand = seed(20260614);

    function resize() {
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.floor(w * h * density);
      stars = Array.from({ length: count }, () => ({
        x: rand() * w,
        y: rand() * h,
        r: 0.4 + rand() * 1.3,
        tw: 0.6 + rand() * 2.4,
        ph: rand() * Math.PI * 2,
        warm: rand() < 0.22,
      }));
    }

    function frame(t) {
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const a = 0.28 + 0.6 * (0.5 + 0.5 * Math.sin(s.ph + (t / 1000) * s.tw));
        ctx.globalAlpha = a;
        ctx.fillStyle = s.warm ? '#e8d3a0' : '#cdd9ff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, [density]);

  return <canvas ref={ref} className="hero-canvas" aria-hidden />;
}
