"use client";

import { useEffect, useState } from "react";
import type { StyleKey } from "@/lib/products";

const SHIRT_PATHS: Record<StyleKey, string> = {
  unisex:
    "M60,30 C80,44 100,48 120,48 C140,48 160,44 180,30 L216,56 L186,92 L177,80 L182,256 L58,256 L63,80 L54,92 L24,56 Z",
  fitted:
    "M66,30 L96,30 L120,62 L144,30 L174,30 L210,56 L180,92 L171,78 L179,192 C179,228 148,248 120,248 C92,248 61,228 61,192 L69,78 L60,92 L30,56 Z",
};

function formatEpoch(ms: number) {
  return ms.toLocaleString("en-US").replace(/,/g, ",");
}

export default function ShirtPreview({ style }: { style: StyleKey }) {
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

  return (
    <div className="relative w-full max-w-sm mx-auto select-none">
      <svg
        viewBox="0 0 240 280"
        className="w-full h-auto drop-shadow-[0_25px_60px_rgba(0,0,0,0.6)]"
      >
        <path
          d={SHIRT_PATHS[style]}
          fill="#141414"
          stroke="#3a3a3a"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        <line
          x1={120}
          y1={style === "fitted" ? 62 : 48}
          x2={120}
          y2={style === "fitted" ? 246 : 254}
          stroke="#232323"
          strokeWidth={1}
        />
      </svg>

      <div className="absolute inset-x-0 top-[30%] flex flex-col items-center gap-1 px-6 text-center">
        <div className="text-[15px] sm:text-lg font-bold tabular-nums tracking-tight text-white">
          {now ? formatEpoch(now) : " "}
        </div>
        <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-white/50">
          datetime.store
        </div>
      </div>
    </div>
  );
}
