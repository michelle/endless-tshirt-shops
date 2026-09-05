"use client";

import { useEffect, useState } from "react";

/**
 * Ticks on every animation frame, mirroring the original datetime.store's
 * canvas clock. Starts at `null` on the server/first paint to avoid a
 * hydration mismatch, then comes alive in the browser.
 */
export function useNow(): number | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    let raf: number;
    const tick = () => {
      setNow(Date.now());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return now;
}
