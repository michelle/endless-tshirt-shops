"use client";

import { useNow } from "@/lib/useNow";
import { ShirtStyle } from "@/lib/shirt";

// Same two shirt silhouettes as the original datetime.store, redrawn as
// self-contained SVG paths (fitted/women's cut vs. unisex crew).
const PATHS: Record<ShirtStyle, string> = {
  fitted:
    "M79.312,15.149c-1.629-1.631-16.117-6.146-16.117-6.146s-4.31,8.721-11.66,8.721s-11.66-8.721-11.66-8.721s-15.354,4.936-16.486,6.068c-1.13,1.13-13.712,16.992-13.712,16.992l10.081,8.37l6.614-5.518c0,0,14.411,23.971,1.384,58.875c0,0,43.546,10.767,47.434,0c-9.689-43.26,1.379-58.613,1.379-58.613l6.267,5.228l9.35-11.117C92.185,29.288,80.945,16.781,79.312,15.149z",
  unisex:
    "M79.313,6.142C77.683,4.511,63.196,4,63.196,4s-9.844,13.724-11.661,13.724C49.719,17.724,39.875,4,39.875,4S24.521,4.932,23.389,6.064c-1.13,1.13-22.827,24.89-22.827,24.89L16.71,42.975l9.662-8.06l1.384,58.875c0,0,43.541,10.705,47.433,0l1.379-58.613l9.347,7.797L100,30.953C100,30.953,80.945,7.774,79.313,6.142z",
};

export default function ShirtPreview({ style }: { style: ShirtStyle }) {
  const now = useNow();

  return (
    <div className="relative w-full max-w-md mx-auto select-none">
      <svg viewBox="0 0 100 125" width="100%" className="drop-shadow-2xl">
        <path d={PATHS[style]} fill="#111114" stroke="#2a2a30" strokeWidth="0.5" />
      </svg>

      <div className="absolute inset-x-0 top-[26%] flex flex-col items-center gap-1 px-6 text-center">
        <div className="tabular-clock font-display font-bold text-white text-[6.5vw] sm:text-[26px] leading-none tracking-tight">
          {now ?? "…"}
        </div>
        <div className="text-white/70 text-[9px] sm:text-[10px] tracking-wide">
          {now ? new Date(now).toLocaleTimeString("en-US") : ""}
        </div>
      </div>

      <div className="absolute left-[8%] top-[68%] rounded bg-white px-2.5 py-1 text-[11px] font-semibold text-black shadow">
        <span className="mr-1.5 text-neutral-400 line-through">$30.00</span>
        $22.50
      </div>
    </div>
  );
}
