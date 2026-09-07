"use client";

import { useEffect, useRef } from "react";
import type { ShirtStyle } from "@/lib/products";

interface ShirtPreviewProps {
  style: ShirtStyle;
  /** When set, the clock stops and shows this exact millisecond forever. */
  frozenAt?: number | null;
}

const FITTED_PATH =
  "M79.3,15.1c-1.6-1.6-16.1-6.1-16.1-6.1s-4.3,8.7-11.7,8.7s-11.7-8.7-11.7-8.7s-15.4,4.9-16.5,6.1C22.2,16.3,9.6,32.1,9.6,32.1l10.1,8.4l6.6-5.5c0,0,14.4,24,1.4,58.9c0,0,43.5,10.8,47.4,0c-9.7-43.3,1.4-58.6,1.4-58.6l6.3,5.2l9.3-11.1C92.2,29.3,80.9,16.8,79.3,15.1z";

const UNISEX_PATH =
  "M79.3,6.1C77.7,4.5,63.2,4,63.2,4s-9.8,13.7-11.7,13.7C49.7,17.7,39.9,4,39.9,4S24.5,4.9,23.4,6.1C22.3,7.2,0.6,31,0.6,31l16.1,12l9.7-8.1l1.4,58.9c0,0,43.5,10.7,47.4,0l1.4-58.6l9.3,7.8L100,31C100,31,80.9,7.8,79.3,6.1z";

/**
 * A live-updating preview of the shirt: a plain black tee silhouette with
 * the current time, in milliseconds since the epoch, printed on the chest.
 * Ticks every animation frame via direct DOM mutation (no re-renders) until
 * `frozenAt` is provided, at which point it locks to that exact millisecond
 * — this is the timestamp that gets printed.
 */
export default function ShirtPreview({ style, frozenAt }: ShirtPreviewProps) {
  const msRef = useRef<HTMLDivElement>(null);
  const isoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (frozenAt != null) return;
    let raf = 0;
    const tick = () => {
      const now = Date.now();
      if (msRef.current) msRef.current.textContent = String(now);
      if (isoRef.current) {
        isoRef.current.textContent = new Date(now)
          .toISOString()
          .replace("T", "  ")
          .replace("Z", " UTC");
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [frozenAt]);

  const staticMs = frozenAt != null ? String(frozenAt) : null;
  const staticIso =
    frozenAt != null
      ? new Date(frozenAt).toISOString().replace("T", "  ").replace("Z", " UTC")
      : null;

  return (
    <div className="relative mx-auto aspect-[4/5] w-full max-w-md select-none">
      <svg
        viewBox="0 0 100 125"
        className="h-full w-full drop-shadow-[0_30px_60px_rgba(0,0,0,0.55)]"
      >
        <path
          d={style === "fitted" ? FITTED_PATH : UNISEX_PATH}
          fill="#111113"
          stroke="#2b2b30"
          strokeWidth="0.5"
        />
      </svg>
      <div className="pointer-events-none absolute inset-x-0 top-[38%] flex flex-col items-center gap-1 px-4 text-center">
        <div
          ref={msRef}
          className="font-mono text-[clamp(1rem,4.4vw,1.6rem)] font-bold tracking-tight text-white tabular-nums"
        >
          {staticMs}
        </div>
        <div
          ref={isoRef}
          className="font-mono text-[clamp(0.5rem,1.6vw,0.65rem)] uppercase tracking-wide text-white/70"
        >
          {staticIso}
        </div>
      </div>
    </div>
  );
}
