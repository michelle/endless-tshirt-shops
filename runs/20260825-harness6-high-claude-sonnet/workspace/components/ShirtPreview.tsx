"use client";

import { useEffect, useRef, useState } from "react";
import type { ShirtStyle } from "@/lib/products";
import { formatNow, type Frozen } from "@/lib/time";

// Same two garment silhouettes as the original datetime.store (fitted vs.
// unisex cut), redrawn as crisp outline paths.
const PATHS: Record<ShirtStyle, string> = {
  fitted:
    "M79.312,15.149c-1.629-1.631-16.117-6.146-16.117-6.146s-4.31,8.721-11.66,8.721s-11.66-8.721-11.66-8.721 s-15.354,4.936-16.486,6.068c-1.13,1.13-13.712,16.992-13.712,16.992l10.081,8.37l6.614-5.518c0,0,14.411,23.971,1.384,58.875 c0,0,43.546,10.767,47.434,0c-9.689-43.26,1.379-58.613,1.379-58.613l6.267,5.228l9.35-11.117 C92.185,29.288,80.945,16.781,79.312,15.149z",
  unisex:
    "M79.313,6.142C77.683,4.511,63.196,4,63.196,4s-9.844,13.724-11.661,13.724 C49.719,17.724,39.875,4,39.875,4S24.521,4.932,23.389,6.064c-1.13,1.13-22.827,24.89-22.827,24.89L16.71,42.975l9.662-8.06 l1.384,58.875c0,0,43.541,10.705,47.433,0l1.379-58.613l9.347,7.797L100,30.953C100,30.953,80.945,7.774,79.313,6.142z",
};

export default function ShirtPreview({
  style,
  frozen,
}: {
  style: ShirtStyle;
  /** When set, the clock stops ticking — used on the confirmation moment. */
  frozen?: { date: string; time: string; tz: string } | null;
}) {
  // The clock only exists client-side (it's tied to the viewer's own clock),
  // so we render nothing time-based until after mount to avoid a
  // server/client hydration mismatch.
  const [now, setNow] = useState<Frozen | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (frozen) return;
    const tick = () => {
      setNow(formatNow(new Date()));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [frozen]);

  const display = frozen ?? now;

  return (
    <div className="relative mx-auto w-full max-w-sm select-none">
      <svg viewBox="0 0 100 125" className="w-full drop-shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
        <path d={PATHS[style]} fill="#0a0a0a" stroke="#2a2a2a" strokeWidth="0.5" />
      </svg>
      <div className="pointer-events-none absolute inset-x-0 top-[26%] flex flex-col items-center gap-1 font-mono text-white">
        <span className="text-[3.2vw] font-semibold tracking-wide sm:text-[12px]">
          {display?.date ?? " "}
        </span>
        <span className="text-[4vw] font-bold tabular-nums tracking-tight sm:text-[15px]">
          {display?.time ?? " "}
        </span>
        <span className="text-[2vw] tracking-[0.3em] text-white/60 sm:text-[8px]">
          {display?.tz ?? " "}
        </span>
      </div>
    </div>
  );
}
