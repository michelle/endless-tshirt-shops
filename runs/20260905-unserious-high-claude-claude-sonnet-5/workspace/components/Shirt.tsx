"use client";

import { useEffect, useRef } from "react";
import type { ColorId } from "@/lib/product";
import { colorInfo } from "@/lib/product";

// A plain crew-neck tee silhouette. Deliberately generic — the point of the
// product was never the garment, it's the number.
const SHIRT_PATH =
  "M66 6 C66 6 78 22 100 22 C122 22 134 6 134 6 L182 30 C188 33 190 40 187 46 L168 82 L150 70 L150 196 C150 205 143 212 134 212 L66 212 C57 212 50 205 50 196 L50 70 L32 82 L13 46 C10 40 12 33 18 30 Z";

interface ShirtProps {
  color: ColorId;
  frozenStampMs?: number | null;
}

export default function Shirt({ color, frozenStampMs = null }: ShirtProps) {
  const stampRef = useRef<HTMLDivElement>(null);
  const info = colorInfo(color);

  useEffect(() => {
    if (frozenStampMs != null) return; // don't tick once a moment is bought
    let raf: number;
    const tick = () => {
      if (stampRef.current) {
        stampRef.current.textContent = String(Date.now());
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [frozenStampMs]);

  return (
    <div className="relative mx-auto w-full max-w-sm animate-float select-none">
      <svg
        viewBox="0 0 200 220"
        className="w-full drop-shadow-[0_20px_40px_rgba(0,0,0,0.25)]"
        aria-hidden="true"
      >
        <path
          d={SHIRT_PATH}
          fill={info.hex}
          stroke="rgba(0,0,0,0.15)"
          strokeWidth="1.5"
        />
      </svg>
      <div
        className="pointer-events-none absolute inset-x-0 top-[38%] flex flex-col items-center gap-1 px-6 font-mono"
        style={{ color: info.ink }}
      >
        <div
          ref={stampRef}
          className="text-[clamp(0.95rem,4.2vw,1.4rem)] font-semibold leading-none tracking-tight tabular-nums"
        >
          {frozenStampMs != null ? String(frozenStampMs) : ""}
        </div>
        <div className="text-[9px] uppercase tracking-[0.2em] opacity-70">
          {frozenStampMs != null ? "frozen forever" : "ms since epoch"}
        </div>
      </div>
    </div>
  );
}
