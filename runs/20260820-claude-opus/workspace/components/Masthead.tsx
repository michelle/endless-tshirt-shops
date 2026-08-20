'use client';

import { useEffect, useRef } from 'react';

/**
 * Header clock. Ticks in the masthead so the premise of the store is legible
 * before you ever look at the shirt.
 */
export default function Masthead() {
  const clockRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (clockRef.current) {
        clockRef.current.textContent = `it is ${Date.now()}`;
      }
      raf = window.requestAnimationFrame(tick);
    };
    tick();
    return () => window.cancelAnimationFrame(raf);
  }, []);

  return (
    <header className="masthead">
      <h1>datetime.store</h1>
      <p>
        we sell a t-shirt with the current datetime.
        <span className="clock" ref={clockRef} suppressHydrationWarning />
      </p>
    </header>
  );
}
