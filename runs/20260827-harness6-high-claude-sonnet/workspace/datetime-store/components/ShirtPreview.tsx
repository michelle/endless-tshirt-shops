"use client";

import { useEffect, useRef, useState } from "react";
import { formatMs, PRICE_CENTS, ShirtStyle } from "@/lib/shirt";

const UNISEX_PATH =
  "M130 18 L100 8 L34 42 L4 96 L46 128 L66 100 L66 448 L334 448 L334 100 L354 128 L396 96 L366 42 L300 8 L270 18 C258 40 158 40 130 18 Z";

const FITTED_PATH =
  "M138 18 L104 6 L34 42 L4 96 L46 128 L66 100 L64 220 C50 300 50 360 66 448 L334 448 C350 360 350 300 336 220 L334 100 L354 128 L396 96 L366 42 L296 6 L262 18 C250 42 150 42 138 18 Z";

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function ShirtPreview({
  style,
  frozenMs,
}: {
  style: ShirtStyle;
  /** When set, the shirt stops ticking and shows this exact timestamp — the moment the customer bought it. */
  frozenMs: number | null;
}) {
  const [now, setNow] = useState<number | null>(null);
  const frameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (frozenMs !== null) return;
    let raf: number;
    const tick = () => {
      setNow(Date.now());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    frameRef.current = raf;
    return () => cancelAnimationFrame(raf);
  }, [frozenMs]);

  const displayMs = frozenMs ?? now;
  const path = style === "fitted" ? FITTED_PATH : UNISEX_PATH;

  return (
    <div className="relative w-full max-w-md mx-auto select-none">
      <svg
        viewBox="0 0 400 480"
        className="w-full h-auto drop-shadow-xl"
        role="img"
        aria-label={`${style} black t-shirt`}
      >
        <path d={path} fill="#111111" stroke="#000" strokeWidth={1} />
      </svg>

      <div className="absolute inset-x-0 top-[30%] flex flex-col items-center px-10">
        <span className="font-mono text-white/50 text-[10px] tracking-[0.3em] uppercase mb-1">
          datetime.store
        </span>
        <span
          className="font-mono text-white text-center leading-none"
          style={{ fontSize: "clamp(14px, 4.4vw, 22px)" }}
          suppressHydrationWarning
        >
          {displayMs === null ? " " : formatMs(displayMs)}
        </span>
        <span className="font-mono text-white/40 text-[9px] mt-1">
          ms since Jan 1, 1970
        </span>
      </div>

      <div className="absolute inset-x-0 top-[68%] flex justify-center">
        <span className="font-mono text-white/80 text-sm tracking-wide">
          {money(PRICE_CENTS)}
        </span>
      </div>

      {frozenMs !== null && (
        <div className="absolute -top-3 right-4 rounded-full bg-emerald-500 text-white text-[11px] font-semibold px-3 py-1 shadow">
          captured ✓
        </div>
      )}
    </div>
  );
}
